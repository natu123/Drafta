import { collection, doc, getDocFromServer, getDocsFromServer, limit, query, runTransaction, serverTimestamp, startAfter, writeBatch, type Firestore, type QueryDocumentSnapshot, type QuerySnapshot, type WriteBatch } from 'firebase/firestore';
import type { BackupNote, WorkspaceBackup } from './workspace-backup';
import { summaryText } from './note-summary';
import { bodyText, cloudWorkspace, readHead, WorkspaceConflictError, WorkspaceStorageError, workspaceRoot } from './cloud-workspace';
import { readLegacyWorkspace } from './cloud-workspace-legacy';

/**
 * Moves a workspace from the 0.7 storage (schemaVersion 1) to summaries and bodies (schemaVersion 2),
 * and back (specs/17). Until the switch the older app keeps working on the same data; after it, the
 * older app stops saving. Every step can run again.
 */
export type MigrationStep = 'reading' | 'bodies' | 'summaries' | 'switching' | 'verifying' | 'cleaning' | 'done';
export type MigrationProgress = { step: MigrationStep; done: number; total: number };
export type MigrationHooks = {
  onProgress?: (progress: MigrationProgress) => void;
  /** Keeps the workspace read first on this device before anything is written. */
  keepBackup?: (backup: WorkspaceBackup) => Promise<void>;
  /** Tests: runs before each step, for example to let an older app save meanwhile. */
  before?: (step: MigrationStep) => Promise<void>;
};

const BATCH = 400;
const CLEAN_BATCH = 100;

async function inBatches<T>(db: Firestore, items: T[], write: (batch: WriteBatch, item: T) => void, progress: (done: number) => void) {
  for (let start = 0; start < items.length; start += BATCH) {
    const batch = writeBatch(db);
    items.slice(start, start + BATCH).forEach(item => write(batch, item));
    await batch.commit();
    progress(Math.min(items.length, start + BATCH));
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
}
/** Same trays, settings, order and memos (every field and body), regardless of key order. */
export const sameWorkspace = (a: WorkspaceBackup, b: WorkspaceBackup) => canonical(a) === canonical(b);

export function workspaceCollections(db: Firestore, uid: string) {
  const root = workspaceRoot(db, uid);
  return { root, summaries: collection(root, 'notes'), bodies: collection(root, 'bodies') };
}

/**
 * Back to the 0.7 storage after a switch whose check failed: every memo gets the 0.7 field from the
 * workspace read first, then the workspace switches back if nothing was saved since the switch.
 */
async function restoreLegacy(db: Firestore, uid: string, backup: WorkspaceBackup, revision: number) {
  const { root, summaries } = workspaceCollections(db, uid);
  await inBatches(db, backup.notes, (batch, note: BackupNote) => batch.set(doc(summaries, note.id), { schemaVersion: 1, payloadJson: JSON.stringify(note), summaryJson: summaryText(note), updatedAt: serverTimestamp() }), () => {});
  await runTransaction(db, async transaction => {
    const head = readHead((await transaction.get(root)).data());
    if (head.version !== 2 || head.revision !== revision) throw new WorkspaceStorageError('Workspace changed after the switch');
    transaction.set(root, { schemaVersion: 1, revision: revision + 1, metadataJson: head.text, updatedAt: serverTimestamp() });
  });
}

/**
 * After the switch (specs/17): a summary drops its 0.7 field only when that field holds exactly the
 * memo the new storage holds, read and written in one transaction, so a memo saved meanwhile by the
 * new app (which writes the new shape) is left as it is. Bodies of memos that no longer exist are
 * deleted. Safe to run again, from any device.
 */
export async function finishMigration(db: Firestore, uid: string, hooks: MigrationHooks = {}): Promise<{ cleaned: number; kept: number }> {
  const { root, summaries, bodies } = workspaceCollections(db, uid);
  await hooks.before?.('cleaning');
  const loaded = await cloudWorkspace(db, uid).load();
  if (!loaded) throw new WorkspaceStorageError('No workspace');
  const current = new Map(loaded.backup.notes.map(note => [note.id, canonical(note)]));
  const order = [...current.keys()];
  let cleaned = 0, kept = 0;
  for (let index = 0; index < order.length; index += CLEAN_BATCH) {
    const ids = order.slice(index, index + CLEAN_BATCH);
    // A transaction may run again; count only the attempt that committed.
    const counts = await runTransaction(db, async transaction => {
      const records = await Promise.all(ids.map(id => transaction.get(doc(summaries, id))));
      const result = { cleaned: 0, kept: 0 };
      for (const record of records) {
        const data = record.data();
        if (!data || data.payloadJson === undefined) continue;
        let same = false;
        try { same = typeof data.summaryJson === 'string' && canonical(JSON.parse(data.payloadJson)) === current.get(record.id); } catch { same = false; }
        if (!same) { result.kept++; continue; }
        transaction.set(record.ref, { schemaVersion: 2, summaryJson: data.summaryJson, updatedAt: serverTimestamp() });
        result.cleaned++;
      }
      return result;
    });
    cleaned += counts.cleaned; kept += counts.kept;
    hooks.onProgress?.({ step: 'cleaning', done: Math.min(order.length, index + CLEAN_BATCH), total: order.length });
  }
  const live = new Set(readHead((await getDocFromServer(root)).data()).metadata.noteOrder);
  let cursor: QueryDocumentSnapshot | null = null;
  for (;;) {
    const page: QuerySnapshot = await getDocsFromServer(cursor ? query(bodies, startAfter(cursor), limit(BATCH)) : query(bodies, limit(BATCH)));
    const orphans = page.docs.filter(record => !live.has(record.id));
    if (orphans.length) {
      const batch = writeBatch(db);
      orphans.forEach(record => batch.delete(record.ref));
      await batch.commit();
    }
    if (page.size < BATCH) break;
    cursor = page.docs[page.size - 1];
  }
  return { cleaned, kept };
}

/** 'migrated' after this run switched, 'already' when the workspace used the new storage already. */
export async function migrateWorkspace(db: Firestore, uid: string, hooks: MigrationHooks = {}): Promise<'migrated' | 'already'> {
  const { root, summaries, bodies } = workspaceCollections(db, uid);
  const progress = (step: MigrationStep, done = 0, total = 1) => hooks.onProgress?.({ step, done, total });
  for (let attempt = 0; attempt < 3; attempt++) {
    await hooks.before?.('reading');
    progress('reading');
    const legacy = await readLegacyWorkspace(db, uid);
    if (!legacy) throw new WorkspaceStorageError('No workspace to migrate');
    // Another device switched; it checks and cleans up itself.
    if (legacy.kind === 'current') { progress('done'); return 'already'; }
    await hooks.keepBackup?.(legacy.saved.backup);
    const notes = legacy.saved.backup.notes;
    await hooks.before?.('bodies');
    await inBatches(db, notes, (batch, note: BackupNote) => batch.set(doc(bodies, note.id), { schemaVersion: 2, documentJson: bodyText(note), updatedAt: serverTimestamp() }), done => progress('bodies', done, notes.length));
    await hooks.before?.('summaries');
    // Added next to the 0.7 field, which the older app keeps reading until the switch.
    await inBatches(db, notes, (batch, note: BackupNote) => batch.update(doc(summaries, note.id), { summaryJson: summaryText(note), updatedAt: serverTimestamp() }), done => progress('summaries', done, notes.length));
    await hooks.before?.('switching');
    progress('switching');
    const outcome = await runTransaction(db, async transaction => {
      const server = await transaction.get(root);
      if (!server.exists()) throw new WorkspaceStorageError('No workspace to migrate');
      const head = readHead(server.data());
      if (head.version === 2) return 'already' as const;
      // An older app saved after the first read: read everything again.
      if (head.revision !== legacy.saved.revision || head.text !== legacy.metadataJson) return 'changed' as const;
      transaction.set(root, { schemaVersion: 2, revision: head.revision + 1, metadataJson: head.text, updatedAt: serverTimestamp() });
      return 'switched' as const;
    });
    if (outcome === 'changed') continue;
    if (outcome === 'already') { progress('done'); return 'already'; }
    await hooks.before?.('verifying');
    progress('verifying');
    let loaded: WorkspaceBackup | null = null;
    try { loaded = (await cloudWorkspace(db, uid).load())?.backup ?? null; } catch { loaded = null; }
    if (!loaded || !sameWorkspace(loaded, legacy.saved.backup)) {
      await restoreLegacy(db, uid, legacy.saved.backup, legacy.saved.revision + 1);
      throw new WorkspaceStorageError('Migration check failed; the previous storage is in use again');
    }
    const { kept } = await finishMigration(db, uid, hooks);
    if (kept) throw new WorkspaceStorageError('Some memos kept their previous storage field');
    progress('done');
    return 'migrated';
  }
  throw new WorkspaceConflictError();
}

/**
 * Back to the 0.7 storage after the migration (specs/17): every memo gets its 0.7 field again,
 * then the workspace switches to schemaVersion 1 if nothing was saved meanwhile. Bodies stay.
 */
export async function downgradeWorkspace(db: Firestore, uid: string): Promise<void> {
  const { root, summaries } = workspaceCollections(db, uid);
  for (let attempt = 0; attempt < 3; attempt++) {
    const loaded = await cloudWorkspace(db, uid).load();
    if (!loaded) throw new WorkspaceStorageError('No workspace to restore');
    await inBatches(db, loaded.backup.notes, (batch, note: BackupNote) => batch.set(doc(summaries, note.id), { schemaVersion: 1, payloadJson: JSON.stringify(note), summaryJson: summaryText(note), updatedAt: serverTimestamp() }), () => {});
    const switched = await runTransaction(db, async transaction => {
      const head = readHead((await transaction.get(root)).data());
      if (head.version !== 2 || head.revision !== loaded.revision) return false;
      transaction.set(root, { schemaVersion: 1, revision: head.revision + 1, metadataJson: head.text, updatedAt: serverTimestamp() });
      return true;
    });
    if (switched) return;
  }
  throw new WorkspaceConflictError();
}
