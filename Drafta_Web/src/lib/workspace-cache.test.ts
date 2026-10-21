import { afterEach, describe, expect, it, vi } from 'vitest';
import { cacheWriter, deleteCachedWorkspace, readCachedWorkspace, writeCachedWorkspace, type CacheStore } from './workspace-cache';
import type { LoadedWorkspace } from './cloud-workspace';
import type { WorkspaceBackup } from './workspace-backup';

const memoryStore = () => {
  const map = new Map<string, unknown>();
  const store: CacheStore = { get: async key => structuredClone(map.get(key)), put: async (key, value) => { map.set(key, structuredClone(value)); }, delete: async key => { map.delete(key); } };
  return { map, store };
};
const backup = (name = 'Inbox'): WorkspaceBackup => ({ format: 'drafta-workspace', version: 1, exportedAt: '2026-10-21T00:00:00.000Z',
  groups: [{ id: 'tray', name, type: 'group' }], notes: [], settings: { language: 'ja', theme: 'system', listStyle: 'bottom', noteSort: 'manual' } });
const loaded = (uid: string, revision: number, name?: string): LoadedWorkspace => ({ saved: { uid, revision, backup: backup(name) }, since: { seconds: 1700000000, nanoseconds: 5 } });

describe('device workspace cache', () => {
  it('keeps one confirmed workspace per account and gives it back validated', async () => {
    const { store } = memoryStore();
    await writeCachedWorkspace(loaded('alice', 3), store);
    await writeCachedWorkspace(loaded('bob', 7, 'Bob tray'), store);
    expect(await readCachedWorkspace('alice', store)).toEqual(loaded('alice', 3));
    expect((await readCachedWorkspace('bob', store))?.saved.backup.groups[0].name).toBe('Bob tray');
    await deleteCachedWorkspace('alice', store);
    expect(await readCachedWorkspace('alice', store)).toBeNull();
    expect(await readCachedWorkspace('bob', store)).not.toBeNull();
  });

  it('drops a record that is broken or belongs to another account', async () => {
    const { map, store } = memoryStore();
    await writeCachedWorkspace(loaded('alice', 3), store);
    map.set('workspace:alice', { ...(map.get('workspace:alice') as object), backupJson: '{"not":"a workspace"}' });
    expect(await readCachedWorkspace('alice', store)).toBeNull();
    expect(map.has('workspace:alice')).toBe(false);
    await writeCachedWorkspace(loaded('dave', 1), store);
    map.set('workspace:carol', map.get('workspace:dave'));
    expect(await readCachedWorkspace('carol', store)).toBeNull();
  });

  it('does not keep a workspace without a server time', async () => {
    const { map, store } = memoryStore();
    await writeCachedWorkspace({ ...loaded('alice', 3), since: null }, store);
    expect(map.size).toBe(0);
  });

  it('works without IndexedDB', async () => {
    expect(await readCachedWorkspace('alice', null)).toBeNull();
    await expect(writeCachedWorkspace(loaded('alice', 1), null)).resolves.toBeUndefined();
  });
});

describe('spaced cache writes', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('writes the latest value at most once per interval and at once on flush', async () => {
    vi.useFakeTimers();
    const writes: number[] = [];
    let current = 1;
    const writer = cacheWriter(async value => { writes.push(value.saved.revision); }, 10000);
    const read = () => loaded('alice', current);
    writer.schedule(read);
    await vi.advanceTimersByTimeAsync(0);
    expect(writes).toEqual([1]);
    current = 2; writer.schedule(read);
    current = 3; writer.schedule(read);
    await vi.advanceTimersByTimeAsync(5000);
    expect(writes).toEqual([1]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(writes).toEqual([1, 3]);
    current = 4; writer.schedule(read);
    await writer.flush();
    expect(writes).toEqual([1, 3, 4]);
    writer.schedule(() => null);
    await vi.advanceTimersByTimeAsync(20000);
    expect(writes).toEqual([1, 3, 4]);
  });
});
