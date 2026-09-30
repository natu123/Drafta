import { doc, getDocFromServer, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { parseWorkspaceBackup, type BackupNote } from './workspace-backup';

export const HISTORY_LIMITS = { versions: 20, intervalMs: 5 * 60 * 1000, payloadBytes: 450000 } as const;
export type MemoHistoryVersion = { id: string; capturedAt: string; note: BackupNote };
type Head = { versionIds: string[]; contentHash: string; capturedAtMs: number };
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;

export function validateHistoryNote(value: unknown): BackupNote {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid history memo');
  const raw = value as Record<string, unknown>;
  if (!validId(raw.id) || !validId(raw.group) || (raw.parentId !== undefined && !validId(raw.parentId))) throw new Error('Invalid history identity');
  const { parentId, ...withoutParent } = raw;
  void parentId;
  const backup = parseWorkspaceBackup(JSON.stringify({ format: 'drafta-workspace', version: 1,
    exportedAt: '2026-09-30T00:00:00.000Z', groups: [{ id: raw.group, name: '', type: 'group' }],
    notes: [withoutParent], settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' },
  }));
  return { ...backup.notes[0], ...(raw.parentId === undefined ? {} : { parentId: raw.parentId as string }) };
}
function timestampMs(value: unknown): number {
  if (!value || typeof value !== 'object' || !('toMillis' in value) || typeof value.toMillis !== 'function') throw new Error('Invalid history timestamp');
  const time: number = value.toMillis();
  if (!Number.isFinite(time) || time < 0 || time > 8640000000000000) throw new Error('Invalid history timestamp');
  // Firestore timestamps may contain microseconds; Date/UI use whole milliseconds.
  return Math.floor(time);
}
function decodeHead(data: Record<string, unknown>): Head {
  if (data.schemaVersion !== 1 || Object.keys(data).some(key => !['schemaVersion', 'versionIds', 'contentHash', 'capturedAt'].includes(key)) ||
      !Array.isArray(data.versionIds) || data.versionIds.length > HISTORY_LIMITS.versions || data.versionIds.some(id => !validId(id)) ||
      new Set(data.versionIds).size !== data.versionIds.length || typeof data.contentHash !== 'string' || !/^[0-9a-f]{64}$/.test(data.contentHash)) throw new Error('Invalid history index');
  return { versionIds: data.versionIds, contentHash: data.contentHash, capturedAtMs: timestampMs(data.capturedAt) };
}
function hasBody(note: BackupNote): boolean {
  const visit = (node: { type?: string; text?: string; content?: unknown[] }): boolean =>
    Boolean(node.text?.trim()) || ['image', 'table', 'horizontalRule'].includes(node.type ?? '') || (node.content ?? []).some(value => visit(value as typeof node));
  return (note.document.document.content ?? []).slice(1).some(visit);
}
export function historyCandidate(current: BackupNote, previous?: BackupNote): { note: BackupNote; force: boolean } | null {
  if (current.type === 'separator') return null;
  if (!previous) return { note: current, force: false };
  const deleted = !previous.isDeleted && Boolean(current.isDeleted);
  const cleared = hasBody(previous) && !hasBody(current);
  if (!deleted && JSON.stringify(current.document) === JSON.stringify(previous.document)) return null;
  return { note: previous, force: deleted || cleared };
}
async function documentHash(note: BackupNote): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(note.document)));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

/** Separate from primary storage, with bounded history and no client clock dependency. */
export function memoHistory(db: Firestore, uid: string) {
  if (!validId(uid)) throw new Error('Invalid history account');
  const cache = new Map<string, { nextCaptureAt: number; hash: string }>();
  const index = (noteId: string) => {
    if (!validId(noteId)) throw new Error('Invalid history memo ID');
    return doc(db, 'users', uid, 'workspaces', 'default', 'memoHistory', noteId);
  };
  async function record(candidate: BackupNote, force = false): Promise<void> {
    const note = validateHistoryNote(candidate);
    // A stored version must never change later with the live sample translation.
    delete note.sampleKey;
    const payloadJson = JSON.stringify(note);
    if (bytes(payloadJson) > HISTORY_LIMITS.payloadBytes) throw new Error('History memo is too large');
    const hash = await documentHash(note);
    const hint = cache.get(note.id);
    if (hint && (hint.hash === hash || (!force && performance.now() < hint.nextCaptureAt))) return;
    const headRef = index(note.id);
    const versionId = crypto.randomUUID();
    const result = await runTransaction(db, async transaction => {
      const current = await transaction.get(doc(db, 'users', uid, 'workspaces', 'default', 'notes', note.id));
      const stored = await transaction.get(headRef);
      if (!current.exists()) return null; // A concurrent permanent deletion must not recreate history.
      const head = stored.exists() ? decodeHead(stored.data()) : null;
      const currentTime = timestampMs(current.data().updatedAt);
      if (head && (head.contentHash === hash || (!force && currentTime - head.capturedAtMs < HISTORY_LIMITS.intervalMs))) {
        return { hash: head.contentHash, waitMs: Math.max(0, HISTORY_LIMITS.intervalMs - (currentTime - head.capturedAtMs)) };
      }
      const ids = [versionId, ...(head?.versionIds ?? [])];
      transaction.set(doc(headRef, 'versions', versionId), { schemaVersion: 1, payloadJson, capturedAt: serverTimestamp() });
      transaction.set(headRef, { schemaVersion: 1, versionIds: ids.slice(0, HISTORY_LIMITS.versions), contentHash: hash, capturedAt: serverTimestamp() });
      for (const removed of ids.slice(HISTORY_LIMITS.versions)) transaction.delete(doc(headRef, 'versions', removed));
      return { hash, waitMs: HISTORY_LIMITS.intervalMs };
    });
    if (result) cache.set(note.id, { nextCaptureAt: performance.now() + result.waitMs, hash: result.hash });
  }
  async function list(noteId: string): Promise<MemoHistoryVersion[]> {
    const headRef = index(noteId);
    // Retry once if another device prunes an entry during this read.
    for (let attempt = 0; attempt < 2; attempt++) {
      const stored = await getDocFromServer(headRef);
      if (!stored.exists()) return [];
      const head = decodeHead(stored.data());
      const versions = await Promise.all(head.versionIds.map(id => getDocFromServer(doc(headRef, 'versions', id))));
      if (versions.some(version => !version.exists())) {
        if (!attempt) continue;
        throw new Error('History changed while loading');
      }
      return versions.map(version => {
        const data = version.data()!;
        if (data.schemaVersion !== 1 || typeof data.payloadJson !== 'string' || bytes(data.payloadJson) > HISTORY_LIMITS.payloadBytes ||
            Object.keys(data).some(key => !['schemaVersion', 'payloadJson', 'capturedAt'].includes(key))) throw new Error('Invalid history version');
        const note = validateHistoryNote(JSON.parse(data.payloadJson));
        if (note.id !== noteId) throw new Error('History memo mismatch');
        return { id: version.id, capturedAt: new Date(timestampMs(data.capturedAt)).toISOString(), note };
      });
    }
    return [];
  }
  async function remove(noteId: string): Promise<void> {
    const headRef = index(noteId);
    await runTransaction(db, async transaction => {
      const stored = await transaction.get(headRef);
      if (!stored.exists()) return;
      const head = decodeHead(stored.data());
      for (const id of head.versionIds) transaction.delete(doc(headRef, 'versions', id));
      transaction.delete(headRef);
    });
    cache.delete(noteId);
  }
  return { record, list, remove };
}
export type MemoHistoryRepository = ReturnType<typeof memoHistory>;
