import { parseTrustedWorkspaceBackup, serializeWorkspaceBackup, type WorkspaceBackup } from './workspace-backup';
import type { LoadedWorkspace } from './cloud-workspace';

/** Where cached workspaces live; IndexedDB in the browser, a map in tests (specs/16). */
export type CacheStore = {
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<void>;
};
type CacheRecord = { format: 'drafta-cache'; version: 1; uid: string; revision: number; since: { seconds: number; nanoseconds: number }; backupJson: string };

const keyFor = (uid: string) => `workspace:${uid}`;

export function indexedDbStore(name = 'drafta-cache'): CacheStore | null {
  if (typeof indexedDB === 'undefined') return null;
  let opened: Promise<IDBDatabase> | null = null;
  const open = () => opened ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('workspaces'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { opened = null; reject(request.error); };
  });
  const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('workspaces', mode);
      const request = action(transaction.objectStore('workspaces'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error ?? request.error);
    });
  };
  return {
    get: key => run('readonly', store => store.get(key)),
    put: async (key, value) => { await run('readwrite', store => store.put(value, key)); },
    delete: async key => { await run('readwrite', store => store.delete(key)); },
  };
}

const defaultStore = () => indexedDbStore();

/** The confirmed workspace this device last saw for the account, or null. A bad record is dropped. */
export async function readCachedWorkspace(uid: string, store: CacheStore | null = defaultStore()): Promise<LoadedWorkspace | null> {
  if (!store) return null;
  try {
    const record = await store.get(keyFor(uid)) as Partial<CacheRecord> | undefined;
    if (!record) return null;
    if (record.format !== 'drafta-cache' || record.version !== 1 || record.uid !== uid || !Number.isSafeInteger(record.revision) || Number(record.revision) < 1 ||
        !record.since || !Number.isSafeInteger(record.since.seconds) || !Number.isSafeInteger(record.since.nanoseconds) || typeof record.backupJson !== 'string') throw new Error('Invalid cache');
    const backup = parseTrustedWorkspaceBackup(record.backupJson);
    return { saved: { uid, revision: Number(record.revision), backup }, since: { seconds: record.since.seconds, nanoseconds: record.since.nanoseconds } };
  } catch {
    await store.delete(keyFor(uid)).catch(() => {});
    return null;
  }
}

/** Only a confirmed workspace with a lower bound of its server time is worth keeping. */
export async function writeCachedWorkspace(loaded: LoadedWorkspace, store: CacheStore | null = defaultStore()): Promise<void> {
  if (!store || !loaded.since) return;
  const { uid, revision, backup } = loaded.saved;
  const record: CacheRecord = { format: 'drafta-cache', version: 1, uid, revision, since: loaded.since, backupJson: serializeWorkspaceBackup(backup) };
  await store.put(keyFor(uid), record);
}

export async function deleteCachedWorkspace(uid: string, store: CacheStore | null = defaultStore()): Promise<void> {
  if (store) await store.delete(keyFor(uid));
}

// The workspace as read before the storage update (specs/17), kept until sign-out like the cache.
const backupKeyFor = (uid: string) => `migration-backup:${uid}`;
export async function keepMigrationBackup(uid: string, backup: WorkspaceBackup, store: CacheStore | null = defaultStore()): Promise<void> {
  if (store) await store.put(backupKeyFor(uid), { format: 'drafta-migration-backup', version: 1, uid, savedAt: new Date().toISOString(), backupJson: JSON.stringify(backup) });
}
export async function deleteMigrationBackup(uid: string, store: CacheStore | null = defaultStore()): Promise<void> {
  if (store) await store.delete(backupKeyFor(uid));
}

/**
 * Writing a large workspace takes a moment, so writes are spaced out: the latest value is read
 * when a write starts, at most once per `interval`, and `flush` writes a pending one now.
 */
export function cacheWriter(write: (value: LoadedWorkspace) => Promise<void>, interval = 10000) {
  let pending: (() => LoadedWorkspace | null) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = 0;
  let running: Promise<void> = Promise.resolve();
  const run = () => {
    timer = undefined;
    const read = pending; pending = null;
    const value = read?.();
    if (!value) return running;
    last = Date.now();
    running = running.then(() => write(value)).catch(() => {});
    return running;
  };
  return {
    schedule(read: () => LoadedWorkspace | null) {
      pending = read;
      if (timer !== undefined) return;
      timer = setTimeout(run, Math.max(0, last + interval - Date.now()));
    },
    flush() { clearTimeout(timer); return pending ? run() : running; },
    cancel() { clearTimeout(timer); timer = undefined; pending = null; },
  };
}
