import { collection, doc, limit, onSnapshot, onSnapshotsInSync, query, Timestamp, where, type DocumentSnapshot, type Firestore, type QuerySnapshot } from 'firebase/firestore';
import { BACKUP_LIMITS, parseWorkspaceBackup, storedNoteText, type BackupNote } from './workspace-backup';
import { CLOUD_LIMITS, WorkspaceStorageError, type SavedWorkspace } from './cloud-workspace';

/**
 * One initial query, then changed documents only; never publish pending/cache-only snapshots.
 * With a loaded base at the server's current revision, only memos saved since that revision are
 * queried, so opening the app reads every memo once instead of twice (specs/15).
 * `known` returns true for a revision this client already holds (its own save); that revision
 * is not parsed again, since revisions only advance through one transaction each.
 */
export function watchCloudWorkspace(db: Firestore, uid: string, next: (workspace: SavedWorkspace) => void, failed: (error: unknown) => void,
  known: (revision: number) => boolean = () => false, base: SavedWorkspace | null = null): () => void {
  if (!uid || uid.length > 128 || uid.includes('/')) throw new WorkspaceStorageError('Invalid account');
  const root = doc(db, 'users', uid, 'workspaces', 'default');
  const notes = collection(root, 'notes');
  let metadata: DocumentSnapshot | null = null;
  let memos: QuerySnapshot | null = null;
  let offNotes: (() => void) | null = null;
  // Memos known from the base; only used when the query is limited to recent saves.
  let baseNotes: Map<string, { note: BackupNote; bytes: number }> | null = null;
  let revision = base?.uid === uid ? base.revision : 0;
  let active = true;
  const encoder = new TextEncoder();
  const readJson = (text: unknown) => {
    if (typeof text !== 'string' || encoder.encode(text).byteLength > CLOUD_LIMITS.documentBytes) throw new WorkspaceStorageError('Invalid stored document');
    return JSON.parse(text);
  };
  const error = (value: unknown) => { if (active) failed(value); };
  const listen = (since: Timestamp | null) => {
    const target = since ? query(notes, where('updatedAt', '>=', since), limit(BACKUP_LIMITS.notes)) : query(notes, limit(BACKUP_LIMITS.notes));
    offNotes = onSnapshot(target, { includeMetadataChanges: true }, snapshot => { memos = snapshot; }, error);
  };
  const offRoot = onSnapshot(root, { includeMetadataChanges: true }, snapshot => {
    metadata = snapshot;
    if (offNotes || snapshot.metadata.fromCache) return;
    const data = snapshot.exists() ? snapshot.data() : null;
    // Same revision and timestamp as the loaded base: every later save carries a newer updatedAt.
    if (base?.uid === uid && data?.revision === base.revision && data.updatedAt instanceof Timestamp) {
      baseNotes = new Map(base.backup.notes.map(note => [note.id, { note, bytes: storedNoteText(note).bytes }]));
      listen(data.updatedAt);
    } else listen(null);
  }, error);
  const offSync = onSnapshotsInSync(db, () => {
    if (!active || !metadata || !memos || metadata.metadata.fromCache || memos.metadata.fromCache || metadata.metadata.hasPendingWrites || memos.metadata.hasPendingWrites) return;
    if (!metadata.exists()) return; // A first-time account may not have saved yet.
    const data = metadata.data();
    if (data.revision === revision) return;
    try {
      if (data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new WorkspaceStorageError('Invalid workspace revision');
      // The recent-saves query is cumulative from the base, so skipping a revision loses nothing.
      if (known(data.revision)) { revision = data.revision; return; }
      const { noteOrder, ...envelope } = readJson(data.metadataJson);
      if (!Array.isArray(noteOrder) || noteOrder.length > BACKUP_LIMITS.notes || new Set(noteOrder).size !== noteOrder.length || noteOrder.some(id => typeof id !== 'string')) throw new WorkspaceStorageError('Invalid note order');
      if (!baseNotes && noteOrder.length !== memos.size) throw new WorkspaceStorageError('Incomplete workspace snapshot');
      const current = new Map(baseNotes ?? []);
      for (const record of memos.docs) {
        const memo = record.data();
        if (memo.schemaVersion !== 1) throw new WorkspaceStorageError('Invalid memo schema');
        if (typeof memo.payloadJson !== 'string') throw new WorkspaceStorageError('Invalid memo payload');
        const payload = readJson(memo.payloadJson);
        if (payload?.id !== record.id) throw new WorkspaceStorageError('Memo ID mismatch');
        current.set(record.id, { note: payload, bytes: encoder.encode(memo.payloadJson).byteLength });
      }
      // Deleted memos leave the order; anything else missing means the snapshot is incomplete.
      let totalBytes = encoder.encode(data.metadataJson).byteLength;
      const ordered = noteOrder.map((id: string) => {
        const entry = current.get(id);
        if (!entry) throw new WorkspaceStorageError('Incomplete workspace snapshot');
        totalBytes += entry.bytes;
        if (totalBytes > BACKUP_LIMITS.bytes) throw new WorkspaceStorageError('Workspace is too large');
        return entry;
      });
      const backup = parseWorkspaceBackup(JSON.stringify({ ...envelope, notes: ordered.map((entry: { note: BackupNote }) => entry.note) }));
      if (baseNotes) baseNotes = new Map(noteOrder.map((id: string, index: number) => [id, ordered[index]]));
      revision = data.revision;
      next({ uid, revision, backup });
    } catch (value) { error(value); }
  });
  return () => { active = false; offRoot(); offNotes?.(); offSync(); };
}
