import { parseWorkspaceBackup, serializeWorkspaceBackup, type BackupNote, type WorkspaceBackup } from './workspace-backup';

export type MergeReason = 'tray-conflict' | 'order-conflict' | 'deletion-conflict' | 'settings-conflict' | 'invalid-result';
export type WorkspaceMerge =
  | { kind: 'merged'; backup: WorkspaceBackup; copies: { originalId: string; copyId: string }[] }
  | { kind: 'review'; reasons: MergeReason[] };
type Options = { newId: () => string; copySuffix: string; now: string };

/** Explicitly confirmed fallback: retain server state and archive this device as separate copies. */
export function preserveWorkspaceCopy(localInput: WorkspaceBackup, remoteInput: WorkspaceBackup, options: Options): WorkspaceBackup {
  const local = parseWorkspaceBackup(serializeWorkspaceBackup(localInput));
  const remote = parseWorkspaceBackup(serializeWorkspaceBackup(remoteInput));
  const taken = new Set([...local.notes, ...remote.notes, ...local.groups, ...remote.groups].map(item => item.id));
  const newId = () => {
    const id = options.newId();
    if (taken.has(id)) throw new Error('Duplicate recovery ID');
    taken.add(id); return id;
  };
  const groupIds = new Map(local.groups.map(group => [group.id, newId()]));
  const noteIds = new Map(local.notes.map(note => [note.id, newId()]));
  const groups = local.groups.map(group => ({ ...group, id: groupIds.get(group.id)!, name: `${group.name} (${options.copySuffix})` }));
  const notes = local.notes.map(note => {
    const copy = { ...note, id: noteIds.get(note.id)!, group: groupIds.get(note.group)!, createdAt: options.now, updatedAt: options.now };
    delete copy.sampleKey;
    if (copy.parentId) copy.parentId = noteIds.get(copy.parentId);
    return copy;
  });
  return parseWorkspaceBackup(serializeWorkspaceBackup({ ...remote, exportedAt: options.now, groups: [...remote.groups, ...groups], notes: [...remote.notes, ...notes] }));
}

function canonical(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => JSON.stringify(key) + ':' + canonical(object[key])).join(',') + '}';
}
const same = (left: unknown, right: unknown) => canonical(left) === canonical(right);
function noteValue(note: BackupNote | undefined) {
  if (!note) return note;
  const { updatedAt, lastAccessedAt, ...value } = note;
  void updatedAt; void lastAccessedAt;
  return value;
}

/** Keeps unilateral reorders, inserts new local IDs around their local anchors. */
function mergeOrder(base: string[], local: string[], remote: string[], available: Set<string>): string[] | null {
  const common = new Set(base.filter(id => available.has(id) && local.includes(id) && remote.includes(id)));
  const project = (ids: string[]) => ids.filter(id => common.has(id));
  const b = project(base), l = project(local), r = project(remote);
  if (!same(l, b) && !same(r, b) && !same(l, r)) return null;
  const primary = !same(l, b) ? local : remote;
  const secondary = primary === local ? remote : local;
  const result = primary.filter(id => available.has(id));
  for (let index = 0; index < secondary.length; index++) {
    const id = secondary[index];
    if (!available.has(id) || result.includes(id)) continue;
    const following = secondary.slice(index + 1).find(next => result.includes(next));
    const preceding = secondary.slice(0, index).reverse().find(previous => result.includes(previous));
    if (index === 0) result.unshift(id);
    else if (index === secondary.length - 1) result.push(id);
    else if (following) result.splice(result.indexOf(following), 0, id);
    else if (preceding) result.splice(result.indexOf(preceding) + 1, 0, id);
    else result.push(id);
  }
  return result;
}

/** Pure three-way merge. Never mutates sources, writes storage or discards a conflict. */
export function mergeWorkspaces(baseInput: WorkspaceBackup, localInput: WorkspaceBackup, remoteInput: WorkspaceBackup, options: Options): WorkspaceMerge {
  const detach = (value: WorkspaceBackup) => parseWorkspaceBackup(serializeWorkspaceBackup(value));
  const base = detach(baseInput), local = detach(localInput), remote = detach(remoteInput);
  const reasons = new Set<MergeReason>();
  const copies: { originalId: string; copyId: string }[] = [];
  const groups = new Map<string, WorkspaceBackup['groups'][number]>();
  const maps = [base, local, remote].map(value => new Map(value.groups.map(group => [group.id, group])));
  for (const id of new Set([...maps[0].keys(), ...maps[1].keys(), ...maps[2].keys()])) {
    const b = maps[0].get(id), l = maps[1].get(id), r = maps[2].get(id);
    if (!same(l, b) && !same(r, b) && !same(l, r)) { reasons.add('tray-conflict'); continue; }
    const chosen = same(l, b) ? r : l;
    if (chosen) groups.set(id, chosen);
  }
  const notes = new Map<string, BackupNote>();
  const noteMaps = [base, local, remote].map(value => new Map(value.notes.map(note => [note.id, note])));
  const allIds = new Set([...noteMaps[0].keys(), ...noteMaps[1].keys(), ...noteMaps[2].keys()]);
  for (const id of allIds) {
    const b = noteMaps[0].get(id), l = noteMaps[1].get(id), r = noteMaps[2].get(id);
    const lc = !same(noteValue(l), noteValue(b)), rc = !same(noteValue(r), noteValue(b));
    let chosen = lc ? l : r;
    if (lc && rc && !same(noteValue(l), noteValue(r))) {
      if (!l || !r || l.isDeleted !== r.isDeleted || l.type === 'separator' || r.type === 'separator') {
        reasons.add('deletion-conflict'); continue;
      }
      const copyId = options.newId();
      if (allIds.has(copyId) || notes.has(copyId)) { reasons.add('invalid-result'); continue; }
      const copy = { ...l, id: copyId, createdAt: options.now, updatedAt: options.now };
      if (!groups.has(copy.group) || (groups.get(copy.group)?.isDeleted && !maps[1].get(copy.group)?.isDeleted)) reasons.add('deletion-conflict');
      delete copy.sampleKey;
      const title = copy.document.document.content![0];
      title.content = [...(title.content ?? []), { type: 'text', text: ` (${options.copySuffix})` }];
      notes.set(copyId, copy);
      copies.push({ originalId: id, copyId });
      chosen = r;
    }
    if (chosen) {
      const group = groups.get(chosen.group);
      const localGroupDeleted = !maps[1].has(chosen.group) || maps[1].get(chosen.group)?.isDeleted;
      const remoteGroupDeleted = !maps[2].has(chosen.group) || maps[2].get(chosen.group)?.isDeleted;
      if (!group || (lc && remoteGroupDeleted && !localGroupDeleted) || (rc && localGroupDeleted && !remoteGroupDeleted)) reasons.add('deletion-conflict');
      notes.set(id, chosen);
    }
  }
  const settings = { ...remote.settings };
  for (const key of Object.keys(settings) as (keyof typeof settings)[]) {
    if (!same(local.settings[key], base.settings[key])) {
      if (!same(remote.settings[key], base.settings[key]) && !same(local.settings[key], remote.settings[key])) reasons.add('settings-conflict');
      else Object.assign(settings, { [key]: local.settings[key] });
    }
  }
  const ids = (items: { id: string }[]) => items.map(item => item.id);
  const groupOrder = mergeOrder(ids(base.groups), ids(local.groups), ids(remote.groups), new Set(groups.keys()));
  const noteOrder = mergeOrder(ids(base.notes), ids(local.notes), ids(remote.notes), new Set(notes.keys()));
  if (!groupOrder || !noteOrder) reasons.add('order-conflict');
  if (reasons.size) return { kind: 'review', reasons: [...reasons] };
  for (const copy of copies) noteOrder!.splice(noteOrder!.indexOf(copy.originalId) + 1, 0, copy.copyId);
  try {
    const backup = detach({ ...remote, exportedAt: options.now, groups: groupOrder!.map(id => groups.get(id)!), notes: noteOrder!.map(id => notes.get(id)!), settings });
    return { kind: 'merged', backup, copies };
  } catch { return { kind: 'review', reasons: ['invalid-result'] }; }
}
