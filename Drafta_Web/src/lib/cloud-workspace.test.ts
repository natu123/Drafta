import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { disableNetwork, doc, enableNetwork, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { cloudWorkspace, LegacyWorkspaceError, WorkspaceConflictError, type SavedWorkspace } from './cloud-workspace';
import { readLegacyWorkspace, writeLegacyWorkspace } from './cloud-workspace-legacy';
import { downgradeWorkspace, finishMigration, migrateWorkspace, sameWorkspace } from './cloud-workspace-migration';
import type { WorkspaceBackup } from './workspace-backup';
import { watchCloudWorkspace } from './cloud-workspace-watch';
import { IMPORT_BATCH_LIMITS } from './obsidian-import';

// Server results delivered to memo-collection listeners, to compare read volumes.
const queryResults: number[] = [];
// The local emulator does not enforce this production query constraint.
vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return { ...actual, limit: (count: number) => {
    if (count > 10000) throw new Error('Production query limit exceeded');
    return actual.limit(count);
  }, onSnapshot: (target: Parameters<typeof actual.onSnapshot>[0], ...rest: unknown[]) => {
    const [options, onNext, ...others] = rest as [unknown, (snapshot: { metadata: { fromCache: boolean }; size?: number }) => void, ...unknown[]];
    const record = (snapshot: { metadata: { fromCache: boolean }; size?: number }) => {
      if ((target as { type?: string }).type === 'query' && !snapshot.metadata.fromCache && snapshot.size !== undefined) queryResults.push(snapshot.size);
      onNext(snapshot);
    };
    return (actual.onSnapshot as (...args: unknown[]) => () => void)(target, options, record, ...others);
  } };
});

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host && host !== '127.0.0.1:8080') throw new Error('Local emulator required');
let env: RulesTestEnvironment;
const fresh = (): WorkspaceBackup => ({
  format: 'drafta-workspace', version: 1, exportedAt: '2026-09-28T00:00:00.000Z',
  groups: [{ id: 'tray', name: 'My tray', type: 'group', isPinned: true }],
  notes: [], settings: { language: 'ja', theme: 'dark', listStyle: 'top', noteSort: 'manual' },
});
const repository = (uid: string) => cloudWorkspace(env.authenticatedContext(uid).firestore() as unknown as Firestore, uid);
const memo = (id: string, text: string, group = 'tray') => ({ id, group, stars: 0 as const, createdAt: '2026-09-28T00:00:00.000Z', updatedAt: '2026-09-28T00:00:00.000Z',
  document: { format: 'drafta-document' as const, schemaVersion: 1 as const, document: { type: 'doc', content: [{ type: 'title', content: [{ type: 'text', text: id }] }, { type: 'paragraph', content: [{ type: 'text', text }] }] } } });

describe.skipIf(!host)('cloud workspace repository (emulator only)', () => {
  it('publishes coherent remote updates and preserves owner boundaries', async () => {
    const owner = repository('alice');
    const first = await owner.save(fresh(), null);
    const updates: number[] = [];
    const errors: unknown[] = [];
    const db = env.authenticatedContext('alice').firestore() as unknown as Firestore;
    const stop = watchCloudWorkspace(db, 'alice', result => updates.push(result.revision), error => errors.push(error));
    try {
      await vi.waitFor(() => expect(updates).toContain(1));
      const changed = fresh(); changed.groups[0].name = 'Remote tray';
      await owner.save(changed, first);
      await vi.waitFor(() => expect(updates).toContain(2));
      expect(errors).toEqual([]);
    } finally { stop(); }
    const denied: unknown[] = [];
    const stopOther = watchCloudWorkspace(env.authenticatedContext('bob').firestore() as unknown as Firestore, 'alice', () => { throw new Error('Cross-account update'); }, error => denied.push(error));
    try { await vi.waitFor(() => expect(denied.length).toBeGreaterThan(0)); } finally { stopOther(); }
  });
  it('skips parsing revisions the client already holds and publishes newer ones', async () => {
    const owner = repository('alice');
    const first = await owner.save(fresh(), null);
    const updates: number[] = [];
    const seen: number[] = [];
    const db = env.authenticatedContext('alice').firestore() as unknown as Firestore;
    const stop = watchCloudWorkspace(db, 'alice', result => updates.push(result.revision), error => { throw error; }, revision => { seen.push(revision); return revision <= 1; });
    try {
      await vi.waitFor(() => expect(seen).toContain(1));
      const changed = fresh(); changed.groups[0].name = 'Remote tray';
      await owner.save(changed, first);
      await vi.waitFor(() => expect(updates).toEqual([2]));
    } finally { stop(); }
  });
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-drafta-storage', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  });
  beforeEach(async () => { await env.clearFirestore(); });
  afterAll(async () => { await env?.cleanup(); });

  it('loads acknowledged settings and trays through a fresh client and preserves empty state', async () => {
    const owner = repository('alice');
    expect(await owner.load()).toBeNull();
    const saved = await owner.save(fresh(), null);
    expect(saved.revision).toBe(1);
    expect(await repository('alice').load()).toEqual(saved);
    const empty = fresh(); empty.groups = [];
    const next = await owner.save(empty, saved);
    expect(await repository('alice').load()).toEqual(next);
  });

  it('rejects stale writers without replacing the winning save', async () => {
    const owner = repository('alice');
    const base = await owner.save(fresh(), null);
    const changed = fresh(); changed.groups[0].name = 'Winner';
    const winner = await owner.save(changed, base);
    await expect(repository('alice').save(fresh(), base)).rejects.toBeInstanceOf(WorkspaceConflictError);
    await expect(owner.save(fresh(), null)).rejects.toBeInstanceOf(WorkspaceConflictError);
    expect(await owner.load()).toEqual(winner);
  });

  it('atomically preserves memo contents and ordering across edits and deletion', async () => {
    const input = fresh();
    input.notes = ['memo-b', 'memo-a'].map(id => ({
      id, group: 'tray', stars: 0, isPinned: true,
      createdAt: input.exportedAt, updatedAt: input.exportedAt,
      document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [
        { type: 'title', content: [{ type: 'text', text: id }] },
        { type: 'paragraph', content: [{ type: 'text', text: '日本語の本文' }] },
      ] } },
    }));
    const owner = repository('alice');
    const base = await owner.save(input, null);
    expect(await repository('alice').load()).toEqual(base);
    input.notes.reverse();
    input.notes[0].isCompleted = true;
    const changed = await owner.save(input, base);
    expect(await repository('alice').load()).toEqual(changed);
    input.notes = [];
    const removed = await owner.save(input, changed);
    expect(await repository('alice').load()).toEqual(removed);
  });

  it('isolates accounts and rejects a baseline belonging to another account', async () => {
    const base = await repository('alice').save(fresh(), null);
    expect(await repository('bob').load()).toBeNull();
    await expect(repository('bob').save(fresh(), base)).rejects.toThrow('Account changed');
  });

  it('rejects corrupt server payloads instead of presenting an empty workspace', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/workspaces/default'), { schemaVersion: 1, revision: 1, metadataJson: '{', updatedAt: serverTimestamp() });
    });
    await expect(repository('alice').load()).rejects.toThrow();
  });

  it('saves a large import only in batches below the per-save change limit', async () => {
    const owner = repository('alice');
    const base = fresh();
    let saved = await owner.save(base, null);
    const imported = Array.from({ length: 801 }, (_, index) => ({
      id: `import-${index}`, group: 'tray', stars: 0 as const, createdAt: base.exportedAt, updatedAt: base.exportedAt,
      document: { format: 'drafta-document' as const, schemaVersion: 1 as const, document: { type: 'doc', content: [
        { type: 'title', content: [{ type: 'text', text: `Imported ${index}` }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Obsidian' }] },
      ] } },
    }));
    await expect(owner.save({ ...base, notes: imported }, saved)).rejects.toThrow('Too many changes in one save');
    for (let start = 0; start < imported.length; start += IMPORT_BATCH_LIMITS.notes) {
      saved = await owner.save({ ...base, notes: imported.slice(0, start + IMPORT_BATCH_LIMITS.notes) }, saved);
    }
    const loaded = await repository('alice').load();
    expect(loaded?.revision).toBe(1 + Math.ceil(imported.length / IMPORT_BATCH_LIMITS.notes));
    expect(loaded?.backup.notes.map(note => note.id)).toEqual(imported.map(note => note.id));
  }, 120000);

  it('reads only memos saved since the loaded revision and still applies remote edits and deletions', async () => {
    const owner = repository('alice');
    const saved = await owner.save({ ...fresh(), notes: ['a', 'b', 'c', 'd', 'e'].map(id => memo(id, 'one')) }, null);
    await owner.save({ ...saved.backup, notes: saved.backup.notes.map(note => note.id === 'e' ? memo('e', 'two') : note) }, saved);
    const base = await repository('alice').load();
    const db = env.authenticatedContext('alice').firestore() as unknown as Firestore;
    queryResults.length = 0;
    const updates: string[][] = [];
    const errors: unknown[] = [];
    const stop = watchCloudWorkspace(db, 'alice', result => updates.push(result.backup.notes.map(note => `${note.id}:${JSON.stringify(note.document).includes('three') ? 3 : 1}`)), error => errors.push(error), undefined, base);
    try {
      await vi.waitFor(() => expect(queryResults.length).toBeGreaterThan(0));
      // Only the memo written by the latest save, not all five.
      expect(queryResults[0]).toBe(1);
      const remote = await repository('alice').load();
      const edited = remote!.backup.notes.filter(note => note.id !== 'b').map(note => note.id === 'a' ? memo('a', 'three') : note);
      await repository('alice').save({ ...remote!.backup, notes: [...edited, memo('f', 'one')] }, remote);
      await vi.waitFor(() => expect(updates).toContainEqual(['a:3', 'c:1', 'd:1', 'e:1', 'f:1']));
      expect(errors).toEqual([]);
    } finally { stop(); }
    // A stale base falls back to the full query.
    queryResults.length = 0;
    const full = watchCloudWorkspace(db, 'alice', () => {}, error => errors.push(error), undefined, base);
    try { await vi.waitFor(() => expect(queryResults[0]).toBe(5)); } finally { full(); }
    expect(errors).toEqual([]);
  });

  it('keeps a diff-subscribed device equal to a full load through another device, offline gaps and its own saves', async () => {
    // Two devices of one account: each context is a separate Firestore client.
    const dbA = env.authenticatedContext('alice').firestore() as unknown as Firestore;
    const deviceA = cloudWorkspace(dbA, 'alice');
    const deviceB = repository('alice');
    let latest = await deviceB.save({ ...fresh(), groups: [...fresh().groups, { id: 'tray2', name: 'Second', type: 'group' }],
      notes: ['a', 'b', 'c', 'd', 'e'].map(id => memo(id, 'one')) }, null);
    latest = await deviceB.save({ ...latest.backup, notes: latest.backup.notes.map(note => note.id === 'e' ? memo('e', 'two') : note) }, latest);
    const base = await deviceA.load();
    let own = base!.revision;
    const updates: SavedWorkspace[] = [];
    const errors: unknown[] = [];
    queryResults.length = 0;
    const stop = watchCloudWorkspace(dbA, 'alice', result => updates.push(result), error => errors.push(error), revision => revision <= own, base);
    // The device must show exactly what a fresh full load returns.
    const converged = async () => {
      const server = await repository('alice').load();
      await vi.waitFor(() => expect(updates.at(-1)).toEqual(server));
      latest = server!;
    };
    const fromB = async (change: (backup: WorkspaceBackup) => WorkspaceBackup) => { latest = await deviceB.save(change(structuredClone(latest.backup)), latest); };
    try {
      await vi.waitFor(() => expect(queryResults.length).toBeGreaterThan(0));
      expect(queryResults[0]).toBe(1); // Only the memo of the base revision; the rest come from the base.
      await fromB(backup => ({ ...backup, notes: [...backup.notes].reverse() })); // Reorder.
      await converged();
      await fromB(backup => ({ ...backup, groups: backup.groups.map(group => group.id === 'tray' ? { ...group, name: 'Renamed' } : group),
        notes: backup.notes.map(note => note.id === 'c' ? { ...note, group: 'tray2' } : note) })); // Tray rename and move.
      await converged();
      await fromB(backup => ({ ...backup, notes: [...backup.notes.filter(note => note.id !== 'b').map(note => note.id === 'a' ? memo('a', 'edited') : note), memo('f', 'new')] }));
      await converged();
      // Device A saves itself (skipped as known), then B saves on top: A's write must not be lost.
      const mine = await deviceA.save({ ...latest.backup, notes: latest.backup.notes.map(note => note.id === 'd' ? memo('d', 'from A') : note) }, latest);
      own = mine.revision; latest = mine;
      await fromB(backup => ({ ...backup, notes: backup.notes.map(note => note.id === 'e' ? memo('e', 'from B') : note) }));
      await converged();
      expect(JSON.stringify(updates.at(-1)!.backup.notes.find(note => note.id === 'd'))).toContain('from A');
      // Offline gap: two remote saves, including a deletion, arrive after reconnecting.
      await disableNetwork(dbA);
      await fromB(backup => ({ ...backup, notes: backup.notes.map(note => note.id === 'f' ? memo('f', 'offline') : note) }));
      await fromB(backup => ({ ...backup, notes: backup.notes.filter(note => note.id !== 'c') }));
      await enableNetwork(dbA);
      await converged();
      expect(errors).toEqual([]);
    } finally { stop(); }
  });

  it('measures memo reads when opening a 429-memo workspace', async () => {
    const owner = repository('alice');
    const notes = Array.from({ length: 429 }, (_, index) => memo(`m${index}`, 'body'));
    let saved = await owner.save(fresh(), null);
    for (let start = 0; start < notes.length; start += IMPORT_BATCH_LIMITS.notes) saved = await owner.save({ ...fresh(), notes: notes.slice(0, start + IMPORT_BATCH_LIMITS.notes) }, saved);
    // A typical last save edits one memo.
    saved = await owner.save({ ...saved.backup, notes: saved.backup.notes.map(note => note.id === 'm7' ? memo('m7', 'edited') : note) }, saved);
    const base = await repository('alice').load();
    const db = env.authenticatedContext('alice').firestore() as unknown as Firestore;
    const opened = async (from: typeof base) => {
      queryResults.length = 0;
      const stop = watchCloudWorkspace(db, 'alice', () => {}, error => { throw error; }, () => false, from);
      try { await vi.waitFor(() => expect(queryResults.length).toBeGreaterThan(0)); return queryResults[0]; } finally { stop(); }
    };
    // load(): root twice + every summary, then every body + root (specs/17); then the watcher's
    // root and its summary query (its body query reads as many).
    const load = 2 + 429 + 429 + 1;
    const before = load + 1 + 2 * await opened(null);
    const after = load + 1 + 2 * Math.max(1, await opened(base));
    console.info(`[reads] 429 memos: before ${before}, after ${after}`);
    expect([before, after]).toEqual([load + 1 + 2 * 429, load + 1 + 2]);
  }, 120000);

  it('rebuilds the server workspace from a device cache and the memos saved since it', async () => {
    const device = repository('alice');
    const other = repository('alice');
    let latest = await other.save({ ...fresh(), groups: [...fresh().groups, { id: 'tray2', name: 'Second', type: 'group' }], notes: ['a', 'b', 'c', 'd', 'e'].map(id => memo(id, 'one')) }, null);
    const cached = (await device.loadWithSince())!;
    expect(cached.since).not.toBeNull();
    // Same revision: the cached workspace itself, no memo reads.
    const same = await device.loadSince(cached);
    expect(same?.saved).toBe(cached.saved);
    // Two saves on another device: edit, delete, add, reorder, tray rename and move.
    latest = await other.save({ ...latest.backup, groups: latest.backup.groups.map(group => group.id === 'tray2' ? { ...group, name: 'Renamed' } : group),
      notes: [memo('f', 'new'), ...latest.backup.notes.filter(note => note.id !== 'b').map(note => note.id === 'a' ? memo('a', 'edited') : note.id === 'c' ? { ...note, group: 'tray2' } : note)].reverse() }, latest);
    await other.save({ ...latest.backup, notes: latest.backup.notes.filter(note => note.id !== 'd').map(note => note.id === 'e' ? memo('e', 'edited twice') : note) }, latest);
    const full = (await repository('alice').loadWithSince())!;
    const rebuilt = (await device.loadSince(cached))!;
    expect(rebuilt.saved).toEqual(full.saved);
    expect(rebuilt.since).toEqual(full.since);
    // An older lower bound only reads more.
    expect((await device.loadSince({ ...cached, since: { seconds: 0, nanoseconds: 0 } }))!.saved).toEqual(full.saved);
    // A cache missing a memo that did not change falls back to the full load.
    const broken = { ...cached, saved: { ...cached.saved, backup: { ...cached.saved.backup, notes: cached.saved.backup.notes.filter(note => note.id !== 'c' && note.id !== 'e') } } };
    expect((await device.loadSince(broken))!.saved).toEqual(full.saved);
    // Another account's cache is never used.
    expect((await device.loadSince({ ...cached, saved: { ...cached.saved, uid: 'bob' } }))!.saved).toEqual(full.saved);
  });

  // Summaries and bodies (specs/17).
  const stored = async (path: string) => {
    let data: Record<string, unknown> | undefined;
    await env.withSecurityRulesDisabled(async context => { data = (await getDoc(doc(context.firestore(), `users/alice/workspaces/default/${path}`))).data(); });
    return data;
  };
  const time = (data: Record<string, unknown> | undefined) => (data?.updatedAt as { toMillis: () => number }).toMillis();
  const db = (uid = 'alice') => env.authenticatedContext(uid).firestore() as unknown as Firestore;

  it('stores each memo as a summary and a body and writes only the part that changed', async () => {
    const owner = repository('alice');
    let saved = await owner.save({ ...fresh(), notes: [memo('a', 'first body'), memo('b', 'second body')] }, null);
    const summary = await stored('notes/a');
    expect(summary?.schemaVersion).toBe(2);
    expect(Object.keys(summary!).sort()).toEqual(['schemaVersion', 'summaryJson', 'updatedAt']);
    expect(JSON.parse(summary!.summaryJson as string)).toMatchObject({ id: 'a', title: 'a', excerpt: 'first body' });
    expect(JSON.parse(summary!.summaryJson as string).document).toBeUndefined();
    expect(JSON.parse((await stored('bodies/a'))!.documentJson as string)).toEqual(saved.backup.notes[0].document);
    // A pin changes the summary only; an edit changes both.
    const before = { summary: time(await stored('notes/a')), body: time(await stored('bodies/a')), other: time(await stored('notes/b')) };
    saved = await owner.save({ ...saved.backup, notes: saved.backup.notes.map(note => note.id === 'a' ? { ...note, isPinned: true } : note) }, saved);
    expect(time(await stored('notes/a'))).toBeGreaterThan(before.summary);
    expect(time(await stored('bodies/a'))).toBe(before.body);
    expect(time(await stored('notes/b'))).toBe(before.other);
    saved = await owner.save({ ...saved.backup, notes: saved.backup.notes.map(note => note.id === 'b' ? memo('b', 'edited') : note) }, saved);
    expect(JSON.parse((await stored('notes/b'))!.summaryJson as string).excerpt).toBe('edited');
    expect((await stored('bodies/b'))!.documentJson).toContain('edited');
    // Deleting a memo deletes both documents.
    await owner.save({ ...saved.backup, notes: saved.backup.notes.filter(note => note.id !== 'a') }, saved);
    expect(await stored('notes/a')).toBeUndefined();
    expect(await stored('bodies/a')).toBeUndefined();
  });

  it('opens from summaries, then reads every body and catches up with a save made meanwhile', async () => {
    const owner = repository('alice');
    const notes = Array.from({ length: 250 }, (_, index) => memo(`m${index}`, `body ${index}`));
    let saved = await owner.save(fresh(), null);
    for (let start = 0; start < notes.length; start += IMPORT_BATCH_LIMITS.notes) saved = await owner.save({ ...fresh(), notes: notes.slice(0, start + IMPORT_BATCH_LIMITS.notes) }, saved);
    const device = repository('alice');
    const partial = (await device.loadSummaries())!;
    expect(partial.revision).toBe(saved.revision);
    expect(partial.summaries.map(summary => [summary.id, summary.title, summary.excerpt])[3]).toEqual(['m3', 'm3', 'body 3']);
    expect(partial.summaries.some(summary => 'document' in summary)).toBe(false);
    // The opened memo is read first.
    const opened = (await device.loadBody('m42'))!;
    expect(opened).toEqual(saved.backup.notes[42].document);
    // Another device saves after the summaries were read: an edit, a deletion and a new memo.
    const latest = await owner.save({ ...saved.backup, notes: [...saved.backup.notes.filter(note => note.id !== 'm1').map(note => note.id === 'm5' ? memo('m5', 'edited') : note), memo('new', 'later')] }, saved);
    const arrived: string[] = [];
    const hydrated = (await device.hydrate(partial, { onBody: id => arrived.push(id), known: new Map([['m42', opened]]) }))!;
    expect(hydrated.saved).toEqual(latest);
    expect(hydrated.saved).toEqual(await repository('alice').load());
    expect(new Set(arrived).size).toBeGreaterThanOrEqual(249);
    expect(arrived).toContain('new');
  }, 120000);

  it('refuses a summary that does not agree with its body', async () => {
    await repository('alice').save({ ...fresh(), notes: [memo('a', 'body')] }, null);
    await env.withSecurityRulesDisabled(async context => {
      const ref = doc(context.firestore(), 'users/alice/workspaces/default/notes/a');
      const data = (await getDoc(ref)).data()!;
      await setDoc(ref, { ...data, summaryJson: JSON.stringify({ ...JSON.parse(data.summaryJson), excerpt: 'something else' }) });
    });
    await expect(repository('alice').load()).rejects.toThrow('Memo summary does not match its body');
  });

  it('migrates a 0.7 workspace with every memo, order, tray and setting, and stops the older app', async () => {
    let legacy = await writeLegacyWorkspace(db(), 'alice', { ...fresh(), groups: [...fresh().groups, { id: 'tray2', name: 'Second', type: 'group' }],
      notes: [memo('a', 'one'), { ...memo('b', 'two', 'tray2'), isPinned: true, isCompleted: true }, memo('c', '日本語')] }, null);
    legacy = await writeLegacyWorkspace(db(), 'alice', { ...legacy.backup, notes: [...legacy.backup.notes].reverse() }, legacy);
    await expect(repository('alice').load()).rejects.toBeInstanceOf(LegacyWorkspaceError);
    const steps: string[] = [];
    let kept: WorkspaceBackup | null = null;
    expect(await migrateWorkspace(db(), 'alice', { onProgress: progress => steps.push(progress.step), keepBackup: async backup => { kept = backup; } })).toBe('migrated');
    expect(kept).toEqual(legacy.backup);
    expect([...new Set(steps)]).toEqual(['reading', 'bodies', 'summaries', 'switching', 'verifying', 'cleaning', 'done']);
    const loaded = (await repository('alice').load())!;
    expect(loaded.revision).toBe(legacy.revision + 1);
    expect(sameWorkspace(loaded.backup, legacy.backup)).toBe(true);
    for (const id of ['a', 'b', 'c']) expect(Object.keys((await stored(`notes/${id}`))!).sort()).toEqual(['schemaVersion', 'summaryJson', 'updatedAt']);
    // 0.7.3 checks the storage version before it saves.
    await expect(writeLegacyWorkspace(db(), 'alice', legacy.backup, legacy)).rejects.toThrow('Invalid server workspace');
    expect(await migrateWorkspace(db(), 'alice')).toBe('already');
    expect((await repository('alice').load())!.revision).toBe(legacy.revision + 1);
  });

  it('reads everything again when an older app saves before the switch', async () => {
    let legacy = await writeLegacyWorkspace(db(), 'alice', { ...fresh(), notes: [memo('a', 'one'), memo('b', 'two'), memo('c', 'three')] }, null);
    let late = false;
    expect(await migrateWorkspace(db(), 'alice', { before: async step => {
      if (step !== 'switching' || late) return;
      late = true;
      legacy = await writeLegacyWorkspace(db(), 'alice', { ...legacy.backup, notes: [...legacy.backup.notes.filter(note => note.id !== 'b'), memo('d', 'late')] }, legacy);
    } })).toBe('migrated');
    expect(late).toBe(true);
    expect(sameWorkspace((await repository('alice').load())!.backup, legacy.backup)).toBe(true);
    // The body of the memo deleted by the older app does not stay behind.
    expect(await stored('bodies/b')).toBeUndefined();
  });

  it('goes back to the 0.7 storage when the check after the switch fails', async () => {
    const legacy = await writeLegacyWorkspace(db(), 'alice', { ...fresh(), notes: [memo('a', 'one'), memo('b', 'two')] }, null);
    await expect(migrateWorkspace(db(), 'alice', { before: async step => {
      if (step !== 'verifying') return;
      await env.withSecurityRulesDisabled(async context => {
        await setDoc(doc(context.firestore(), 'users/alice/workspaces/default/bodies/a'), { schemaVersion: 2, documentJson: JSON.stringify(memo('a', 'damaged').document), updatedAt: serverTimestamp() });
      });
    } })).rejects.toThrow('Migration check failed');
    const back = await readLegacyWorkspace(db(), 'alice');
    expect(back?.kind).toBe('legacy');
    expect(back?.kind === 'legacy' && sameWorkspace(back.saved.backup, legacy.backup)).toBe(true);
    // The older app works again.
    if (back?.kind === 'legacy') await writeLegacyWorkspace(db(), 'alice', { ...back.saved.backup, notes: [memo('a', 'after')] }, back.saved);
  });

  it('finishes a migration stopped after the switch without touching memos saved since', async () => {
    const legacy = await writeLegacyWorkspace(db(), 'alice', { ...fresh(), notes: [memo('a', 'one'), memo('b', 'two'), memo('c', 'three')] }, null);
    await expect(migrateWorkspace(db(), 'alice', { before: async step => { if (step === 'cleaning') throw new Error('Closed the tab'); } })).rejects.toThrow('Closed the tab');
    // The new app works on the switched workspace and saves one memo meanwhile.
    const switched = (await repository('alice').load())!;
    expect(sameWorkspace(switched.backup, legacy.backup)).toBe(true);
    expect((await stored('notes/a'))!.payloadJson).toBeTypeOf('string');
    const edited = await repository('alice').save({ ...switched.backup, notes: switched.backup.notes.map(note => note.id === 'a' ? memo('a', 'new app') : note) }, switched);
    expect(await finishMigration(db(), 'alice')).toEqual({ cleaned: 2, kept: 0 });
    expect((await repository('alice').load())).toEqual(edited);
    for (const id of ['a', 'b', 'c']) expect((await stored(`notes/${id}`))!.payloadJson).toBeUndefined();
  });

  it('can go back to the 0.7 storage after the migration, keeping later edits', async () => {
    await writeLegacyWorkspace(db(), 'alice', { ...fresh(), notes: [memo('a', 'one'), memo('b', 'two')] }, null);
    await migrateWorkspace(db(), 'alice');
    const current = (await repository('alice').load())!;
    const edited = await repository('alice').save({ ...current.backup, notes: [...current.backup.notes, memo('c', 'new app')] }, current);
    await downgradeWorkspace(db(), 'alice');
    const back = await readLegacyWorkspace(db(), 'alice');
    expect(back?.kind === 'legacy' && sameWorkspace(back.saved.backup, edited.backup)).toBe(true);
    await expect(repository('alice').load()).rejects.toBeInstanceOf(LegacyWorkspaceError);
    // Migrating again brings the same workspace back.
    expect(await migrateWorkspace(db(), 'alice')).toBe('migrated');
    expect(sameWorkspace((await repository('alice').load())!.backup, edited.backup)).toBe(true);
  });

  it('reports a workspace still in the 0.7 storage to a watching device', async () => {
    await writeLegacyWorkspace(db(), 'alice', { ...fresh(), notes: [memo('a', 'one')] }, null);
    const errors: unknown[] = [];
    const stop = watchCloudWorkspace(db(), 'alice', () => { throw new Error('Unexpected update'); }, error => errors.push(error));
    try { await vi.waitFor(() => expect(errors[0]).toBeInstanceOf(LegacyWorkspaceError)); } finally { stop(); }
  });
});