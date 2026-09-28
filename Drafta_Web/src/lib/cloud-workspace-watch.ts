import { collection, doc, limit, onSnapshot, onSnapshotsInSync, query, type DocumentSnapshot, type Firestore, type QuerySnapshot } from 'firebase/firestore';
import { BACKUP_LIMITS, parseWorkspaceBackup } from './workspace-backup';
import { CLOUD_LIMITS, WorkspaceStorageError, type SavedWorkspace } from './cloud-workspace';

/** One initial query, then changed documents only; never publish pending/cache-only snapshots. */
export function watchCloudWorkspace(db: Firestore, uid: string, next: (workspace: SavedWorkspace) => void, failed: (error: unknown) => void): () => void {
  if (!uid || uid.length > 128 || uid.includes('/')) throw new WorkspaceStorageError('Invalid account');
  const root = doc(db, 'users', uid, 'workspaces', 'default');
  let metadata: DocumentSnapshot | null = null;
  let memos: QuerySnapshot | null = null;
  let revision = 0;
  let active = true;
  const readJson = (text: unknown) => {
    if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > CLOUD_LIMITS.documentBytes) throw new WorkspaceStorageError('Invalid stored document');
    return JSON.parse(text);
  };
  const error = (value: unknown) => { if (active) failed(value); };
  const offRoot = onSnapshot(root, { includeMetadataChanges: true }, snapshot => { metadata = snapshot; }, error);
  const offNotes = onSnapshot(query(collection(root, 'notes'), limit(BACKUP_LIMITS.notes)), { includeMetadataChanges: true }, snapshot => { memos = snapshot; }, error);
  const offSync = onSnapshotsInSync(db, () => {
    if (!active || !metadata || !memos || metadata.metadata.fromCache || memos.metadata.fromCache || metadata.metadata.hasPendingWrites || memos.metadata.hasPendingWrites) return;
    if (!metadata.exists()) return; // A first-time account may not have saved yet.
    const data = metadata.data();
    if (data.revision === revision) return;
    try {
      if (data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new WorkspaceStorageError('Invalid workspace revision');
      const { noteOrder, ...envelope } = readJson(data.metadataJson);
      if (!Array.isArray(noteOrder) || noteOrder.length > BACKUP_LIMITS.notes || new Set(noteOrder).size !== noteOrder.length || noteOrder.some(id => typeof id !== 'string')) throw new WorkspaceStorageError('Invalid note order');
      if (noteOrder.length !== memos.size) throw new WorkspaceStorageError('Incomplete workspace snapshot');
      let totalBytes = new TextEncoder().encode(data.metadataJson).byteLength;
      const byId = new Map(memos.docs.map(record => {
        const memo = record.data();
        if (memo.schemaVersion !== 1) throw new WorkspaceStorageError('Invalid memo schema');
        if (typeof memo.payloadJson !== 'string') throw new WorkspaceStorageError('Invalid memo payload');
        totalBytes += new TextEncoder().encode(memo.payloadJson).byteLength;
        if (totalBytes > BACKUP_LIMITS.bytes) throw new WorkspaceStorageError('Workspace is too large');
        const payload = readJson(memo.payloadJson);
        if (payload?.id !== record.id) throw new WorkspaceStorageError('Memo ID mismatch');
        return [record.id, payload];
      }));
      const backup = parseWorkspaceBackup(JSON.stringify({ ...envelope, notes: noteOrder.map(id => byId.get(id)) }));
      revision = data.revision;
      next({ uid, revision, backup });
    } catch (value) { error(value); }
  });
  return () => { active = false; offRoot(); offNotes(); offSync(); };
}
