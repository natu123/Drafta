import { collection, doc, getDocFromServer, getDocsFromServer, limit, query, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { BACKUP_LIMITS, parseWorkspaceBackup, serializeWorkspaceBackup, type WorkspaceBackup } from './workspace-backup';

export class WorkspaceConflictError extends Error {
  constructor() { super('The server workspace changed. Reload before saving.'); this.name = 'WorkspaceConflictError'; }
}
export class WorkspaceStorageError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkspaceStorageError'; }
}
export type SavedWorkspace = { uid: string; revision: number; backup: WorkspaceBackup };
export const CLOUD_LIMITS = { documentBytes: 450000, transactionBytes: 8000000, changedNotes: 400 } as const;
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;

function checkSize(text: string): string {
  if (bytes(text) > CLOUD_LIMITS.documentBytes) throw new WorkspaceStorageError('Document is too large to save');
  return text;
}
function checkedBackup(input: WorkspaceBackup): WorkspaceBackup {
  return parseWorkspaceBackup(serializeWorkspaceBackup(input));
}
function revisionOf(data: Record<string, unknown> | undefined): number {
  if (!data || data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1) throw new WorkspaceStorageError('Invalid server workspace');
  return Number(data.revision);
}

/** Cloud-only repository. All reads come from the server, never offline cache. */
export function cloudWorkspace(db: Firestore, uid: string) {
  if (!uid || uid.length > 128 || uid.includes('/')) throw new WorkspaceStorageError('Invalid account');
  const root = doc(db, 'users', uid, 'workspaces', 'default');
  const notesCollection = collection(root, 'notes');

  async function load(): Promise<SavedWorkspace | null> {
    // Read the revision twice so a concurrent atomic save cannot mix two states.
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = await getDocFromServer(root);
      if (!start.exists()) return null;
      const revision = revisionOf(start.data());
      const text = start.data().metadataJson;
      if (typeof text !== 'string') throw new WorkspaceStorageError('Missing workspace metadata');
      checkSize(text);
      const metadata = JSON.parse(text);
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) ||
          Object.keys(metadata).some(key => !['format', 'version', 'exportedAt', 'groups', 'settings', 'noteOrder'].includes(key)) ||
          !Array.isArray(metadata.noteOrder) || metadata.noteOrder.length > BACKUP_LIMITS.notes ||
          metadata.noteOrder.some((id: unknown) => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) ||
          new Set(metadata.noteOrder).size !== metadata.noteOrder.length) throw new WorkspaceStorageError('Invalid note order');
      const records = await getDocsFromServer(query(notesCollection, limit(BACKUP_LIMITS.notes + 1)));
      const finish = await getDocFromServer(root);
      if (!finish.exists() || revisionOf(finish.data()) !== revision) continue;
      if (records.size !== metadata.noteOrder.length) throw new WorkspaceStorageError('Incomplete server workspace');
      let total = bytes(text);
      const notes = new Map(records.docs.map(record => {
        const data = record.data();
        if (data.schemaVersion !== 1 || typeof data.payloadJson !== 'string') throw new WorkspaceStorageError('Invalid server memo');
        checkSize(data.payloadJson);
        total += bytes(data.payloadJson);
        if (total > BACKUP_LIMITS.bytes) throw new WorkspaceStorageError('Workspace is too large');
        const note = JSON.parse(data.payloadJson);
        if (!note || note.id !== record.id) throw new WorkspaceStorageError('Memo ID mismatch');
        return [record.id, note] as const;
      }));
      const { noteOrder, ...envelope } = metadata;
      const backup = parseWorkspaceBackup(JSON.stringify({ ...envelope, notes: noteOrder.map((id: string) => {
        if (!notes.has(id)) throw new WorkspaceStorageError('Missing memo');
        return notes.get(id);
      }) }));
      return { uid, revision, backup };
    }
    throw new WorkspaceConflictError();
  }

  async function save(input: WorkspaceBackup, base: SavedWorkspace | null): Promise<SavedWorkspace> {
    if (base && base.uid !== uid) throw new WorkspaceStorageError('Account changed');
    const backup = checkedBackup(input);
    const { notes, ...envelope } = backup;
    const metadataJson = checkSize(JSON.stringify({ ...envelope, noteOrder: notes.map(note => note.id) }));
    const previous = new Map((base?.backup.notes ?? []).map(note => [note.id, JSON.stringify(note)]));
    const current = new Map(notes.map(note => [note.id, checkSize(JSON.stringify(note))]));
    const writes = [...current].filter(([id, text]) => previous.get(id) !== text);
    const deletes = [...previous.keys()].filter(id => !current.has(id));
    if (writes.length + deletes.length > CLOUD_LIMITS.changedNotes ||
        writes.reduce((size, [, text]) => size + bytes(text), bytes(metadataJson)) > CLOUD_LIMITS.transactionBytes) {
      throw new WorkspaceStorageError('Too many changes in one save');
    }
    const revision = (base?.revision ?? 0) + 1;
    await runTransaction(db, async transaction => {
      const server = await transaction.get(root);
      const actual = server.exists() ? revisionOf(server.data()) : 0;
      if (actual !== (base?.revision ?? 0)) throw new WorkspaceConflictError();
      transaction.set(root, { schemaVersion: 1, revision, metadataJson, updatedAt: serverTimestamp() });
      for (const [id, payloadJson] of writes) transaction.set(doc(notesCollection, id), { schemaVersion: 1, payloadJson, updatedAt: serverTimestamp() });
      for (const id of deletes) transaction.delete(doc(notesCollection, id));
    });
    // Only the successful server transaction advances the acknowledged baseline.
    return { uid, revision, backup };
  }
  return { load, save };
}
