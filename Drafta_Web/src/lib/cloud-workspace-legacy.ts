import { collection, doc, getDocFromServer, getDocsFromServer, limit, query, runTransaction, serverTimestamp, startAfter, type Firestore } from 'firebase/firestore';
import { BACKUP_LIMITS, parseTrustedWorkspaceBackup, parseWorkspaceBackup, serializeWorkspaceBackup, type BackupNote, type WorkspaceBackup } from './workspace-backup';
import { CLOUD_LIMITS, readHead, WorkspaceConflictError, WorkspaceStorageError, workspaceRoot, type SavedWorkspace } from './cloud-workspace';

/**
 * The 0.7 storage (schemaVersion 1): every memo with its body in `notes/{id}.payloadJson`. Only the
 * migration reads it (specs/17); tests also write it to stand for 0.7.3.
 */
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;

/** The whole 0.7 workspace at one revision; `current` when the server already uses the new storage. */
export async function readLegacyWorkspace(db: Firestore, uid: string): Promise<{ kind: 'legacy'; saved: SavedWorkspace; metadataJson: string } | { kind: 'current' } | null> {
  const root = workspaceRoot(db, uid);
  const notes = collection(root, 'notes');
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = await getDocFromServer(root);
    if (!start.exists()) return null;
    const head = readHead(start.data());
    if (head.version !== 1) return { kind: 'current' };
    const records = await getDocsFromServer(query(notes, limit(BACKUP_LIMITS.notes)));
    const overflow = records.size === BACKUP_LIMITS.notes ? await getDocsFromServer(query(notes, startAfter(records.docs[records.size - 1]), limit(1))) : null;
    const finish = await getDocFromServer(root);
    if (!finish.exists() || readHead(finish.data()).revision !== head.revision) continue;
    if (overflow && !overflow.empty) throw new WorkspaceStorageError('Workspace has too many memos');
    if (records.size !== head.metadata.noteOrder.length) throw new WorkspaceStorageError('Incomplete server workspace');
    let total = bytes(head.text);
    const found = new Map(records.docs.map(record => {
      const data = record.data();
      if (data.schemaVersion !== 1 || typeof data.payloadJson !== 'string') throw new WorkspaceStorageError('Invalid server memo');
      if (bytes(data.payloadJson) > CLOUD_LIMITS.documentBytes) throw new WorkspaceStorageError('Document is too large to save');
      total += bytes(data.payloadJson);
      if (total > BACKUP_LIMITS.bytes) throw new WorkspaceStorageError('Workspace is too large');
      const note = JSON.parse(data.payloadJson);
      if (!note || note.id !== record.id) throw new WorkspaceStorageError('Memo ID mismatch');
      return [record.id, note as BackupNote] as const;
    }));
    const { noteOrder, ...envelope } = head.metadata;
    const backup = parseTrustedWorkspaceBackup(JSON.stringify({ ...envelope, notes: noteOrder.map(id => {
      const note = found.get(id);
      if (!note) throw new WorkspaceStorageError('Missing memo');
      return note;
    }) }));
    return { kind: 'legacy', saved: { uid, revision: head.revision, backup }, metadataJson: head.text };
  }
  throw new WorkspaceConflictError();
}

/** 0.7.3's save, without memo history: stands for an older app in tests. */
export async function writeLegacyWorkspace(db: Firestore, uid: string, input: WorkspaceBackup, base: SavedWorkspace | null): Promise<SavedWorkspace> {
  const root = workspaceRoot(db, uid);
  const notes = collection(root, 'notes');
  const backup = parseWorkspaceBackup(serializeWorkspaceBackup(input));
  const { notes: list, ...envelope } = backup;
  const metadataJson = JSON.stringify({ ...envelope, noteOrder: list.map(note => note.id) });
  const previous = new Map((base?.backup.notes ?? []).map(note => [note.id, JSON.stringify(note)]));
  const writes = list.map(note => [note.id, JSON.stringify(note)] as const).filter(([id, text]) => previous.get(id) !== text);
  const deletes = [...previous.keys()].filter(id => !list.some(note => note.id === id));
  const revision = (base?.revision ?? 0) + 1;
  await runTransaction(db, async transaction => {
    const server = await transaction.get(root);
    // 0.7.3 stops on any other storage version, like this check.
    const actual = server.exists() ? readHead(server.data()) : null;
    if (actual && actual.version !== 1) throw new WorkspaceStorageError('Invalid server workspace');
    if ((actual?.revision ?? 0) !== (base?.revision ?? 0)) throw new WorkspaceConflictError();
    transaction.set(root, { schemaVersion: 1, revision, metadataJson, updatedAt: serverTimestamp() });
    for (const [id, payloadJson] of writes) transaction.set(doc(notes, id), { schemaVersion: 1, payloadJson, updatedAt: serverTimestamp() });
    for (const id of deletes) transaction.delete(doc(notes, id));
  });
  return { uid, revision, backup };
}
