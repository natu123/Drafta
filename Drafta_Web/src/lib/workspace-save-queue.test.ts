/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceSaveQueue } from './workspace-save-queue';
import { WorkspaceConflictError, type SavedWorkspace } from './cloud-workspace';
import { snapshotWorkspace, type WorkspaceBackup } from './workspace-backup';
import { notes, groups } from './data';

const value = (): WorkspaceBackup => ({ format: 'drafta-workspace', version: 1, exportedAt: '2026-09-28T00:00:00.000Z', groups: [], notes: [], settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' } });
const saved = (backup: WorkspaceBackup, revision = 1): SavedWorkspace => ({ uid: 'alice', revision, backup });
afterEach(() => vi.useRealTimers());

describe('workspace autosave queue', () => {
  it('saves a frozen snapshot without copying it and detaches other values', async () => {
    const save = vi.fn(async (input: WorkspaceBackup) => saved(input, 2));
    const queue = new WorkspaceSaveQueue(saved(value()), save, vi.fn());
    const snapshot = snapshotWorkspace({ notes, groups, settings: value().settings }, document);
    queue.enqueue(snapshot, true); await queue.flush();
    expect(save.mock.calls[0][0]).toBe(snapshot);
    const plain = value(); queue.enqueue(plain, true); await queue.flush();
    expect(save.mock.calls[1][0]).not.toBe(plain);
    expect(save.mock.calls[1][0]).toEqual(plain); queue.dispose();
  });
  it('rebases pending edits onto a remote revision before saving', async () => {
    vi.useFakeTimers();
    const base = saved(value());
    const remote = saved(value(), 2);
    const combined = value(); combined.settings.theme = 'dark'; combined.settings.language = 'ja';
    const apply = vi.fn();
    const merge = vi.fn(() => ({ kind: 'merged' as const, backup: combined, copies: [] }));
    const save = vi.fn(async (input: WorkspaceBackup) => saved(input, 3));
    const queue = new WorkspaceSaveQueue(base, save, vi.fn(), { load: async () => remote, merge, apply, review: vi.fn() });
    const edited = value(); edited.settings.theme = 'dark'; queue.enqueue(edited);
    queue.acceptRemote(remote); await vi.advanceTimersByTimeAsync(0);
    expect(merge).toHaveBeenCalledWith(base.backup, edited, remote.backup);
    expect(save).toHaveBeenCalledWith(combined, remote);
    expect(apply).toHaveBeenCalledWith(combined, []); queue.dispose();
  });
  it('recovers a transaction conflict through three-way merge', async () => {
    const base = saved(value()), remote = saved(value(), 2);
    const save = vi.fn().mockRejectedValueOnce(new WorkspaceConflictError()).mockImplementationOnce(async input => saved(input, 3));
    const queue = new WorkspaceSaveQueue(base, save, vi.fn(), {
      load: async () => remote, merge: (_base, local) => ({ kind: 'merged', backup: local, copies: [] }), apply: vi.fn(), review: vi.fn(),
    });
    queue.enqueue(value()); await queue.flush();
    expect(save).toHaveBeenCalledTimes(2); expect(save.mock.calls[1][1]).toEqual(remote);
    expect(queue.status).toBe('saved'); queue.dispose();
  });
  it('does not write when structural conflicts require review', async () => {
    vi.useFakeTimers();
    const remote = saved(value(), 2), save = vi.fn(), review = vi.fn();
    const queue = new WorkspaceSaveQueue(saved(value()), save, vi.fn(), {
      load: async () => remote, merge: () => ({ kind: 'review', reasons: ['order-conflict'] }), apply: vi.fn(), review,
    });
    queue.enqueue(value()); queue.acceptRemote(remote); await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled(); expect(review).toHaveBeenCalledWith(remote);
    expect(queue.dirty).toBe(true); expect(queue.status).toBe('conflict'); queue.dispose();
  });
  it('saves an immediate edit queued while an empty flush is settling', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (input: WorkspaceBackup) => saved(input));
    const queue = new WorkspaceSaveQueue(null, save, vi.fn());
    const empty = queue.flush();
    queue.enqueue(value(), true);
    await empty; await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.status).toBe('saved'); queue.dispose();
  });
  it('debounces edits and reports saved only after acknowledgement', async () => {
    vi.useFakeTimers();
    const report = vi.fn();
    const save = vi.fn(async (input: WorkspaceBackup) => saved(input));
    const queue = new WorkspaceSaveQueue(null, save, report);
    const input = value(); queue.enqueue(input); input.settings.theme = 'dark';
    expect(queue.dirty).toBe(true);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(800);
    expect(save.mock.calls[0][0].settings.theme).toBe('system');
    expect(queue.status).toBe('saved'); expect(queue.dirty).toBe(false);
    queue.dispose();
  });

  it('serializes edits made during an outstanding save using its acknowledged revision', async () => {
    let resolve!: (value: SavedWorkspace) => void;
    const save = vi.fn<(input: WorkspaceBackup, base: SavedWorkspace | null) => Promise<SavedWorkspace>>()
      .mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockImplementationOnce(async input => saved(input, 2));
    const queue = new WorkspaceSaveQueue(null, save, vi.fn());
    const first = value(); queue.enqueue(first); const flushing = queue.flush();
    const second = value(); second.settings.theme = 'dark'; queue.enqueue(second);
    expect(save).toHaveBeenCalledTimes(1);
    resolve(saved(first)); await flushing;
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1]?.revision).toBe(1);
    expect(save.mock.calls[1][0]).toEqual(second);
    queue.dispose();
  });

  it('retains failed edits, retries three times and allows explicit retry', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const queue = new WorkspaceSaveQueue(null, save, vi.fn());
    queue.enqueue(value()); await queue.flush();
    await vi.advanceTimersByTimeAsync(7000);
    expect(save).toHaveBeenCalledTimes(4);
    expect(queue.dirty).toBe(true); expect(queue.status).toBe('error');
    save.mockImplementation(async input => saved(input));
    await queue.retry(); expect(queue.status).toBe('saved'); queue.dispose();
  });

  it('never retries a conflict or lets later edits restart it', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue(new WorkspaceConflictError());
    const queue = new WorkspaceSaveQueue(null, save, vi.fn());
    queue.enqueue(value()); await queue.flush();
    queue.enqueue(value()); await queue.retry(); await vi.advanceTimersByTimeAsync(10000);
    expect(save).toHaveBeenCalledTimes(1); expect(queue.status).toBe('conflict'); queue.dispose();
  });

  it('retries the newest edit after a disconnected outstanding save fails', async () => {
    vi.useFakeTimers();
    let reject!: (error: Error) => void;
    const base = saved(value(), 4);
    const save = vi.fn<(input: WorkspaceBackup, base: SavedWorkspace | null) => Promise<SavedWorkspace>>()
      .mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }))
      .mockImplementationOnce(async input => saved(input, 5));
    const queue = new WorkspaceSaveQueue(base, save, vi.fn());
    const first = value(); first.settings.theme = 'dark';
    queue.enqueue(first); const flushing = queue.flush();
    const latest = value(); latest.settings.language = 'ja';
    queue.enqueue(latest); reject(new Error('offline')); await flushing;
    expect(queue.status).toBe('error'); expect(queue.dirty).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save.mock.calls[1]).toEqual([latest, base]);
    expect(queue.status).toBe('saved'); expect(queue.dirty).toBe(false);
    queue.dispose();
  });

  it('keeps later edits after retry exhaustion until an explicit retry succeeds', async () => {
    vi.useFakeTimers();
    const base = saved(value(), 3);
    const save = vi.fn().mockRejectedValue(new Error('unavailable'));
    const queue = new WorkspaceSaveQueue(base, save, vi.fn());
    queue.enqueue(value()); await queue.flush(); await vi.advanceTimersByTimeAsync(7000);
    const latest = value(); latest.settings.language = 'ja'; queue.enqueue(latest);
    await vi.advanceTimersByTimeAsync(10000);
    expect(save).toHaveBeenCalledTimes(4); expect(queue.dirty).toBe(true);
    save.mockImplementation(async input => saved(input, 4)); await queue.retry();
    expect(save.mock.calls[4]).toEqual([latest, base]);
    expect(queue.status).toBe('saved'); expect(queue.dirty).toBe(false);
    queue.dispose();
  });

  it('does not mark a rejected authorization save as saved and retains its candidate', async () => {
    const base = saved(value());
    const save = vi.fn().mockRejectedValueOnce({ code: 'permission-denied' })
      .mockImplementationOnce(async input => saved(input, 2));
    const queue = new WorkspaceSaveQueue(base, save, vi.fn());
    const edited = value(); edited.settings.theme = 'dark';
    queue.enqueue(edited); await queue.flush();
    expect(queue.status).toBe('error'); expect(queue.dirty).toBe(true);
    await queue.retry();
    expect(save.mock.calls[1]).toEqual([edited, base]);
    expect(queue.status).toBe('saved'); queue.dispose();
  });

  it('does not publish late results or write queued changes after disposal', async () => {
    let resolve!: (value: SavedWorkspace) => void;
    const save = vi.fn(() => new Promise<SavedWorkspace>(done => { resolve = done; }));
    const report = vi.fn(); const queue = new WorkspaceSaveQueue(null, save, report);
    queue.enqueue(value()); const flushing = queue.flush(); queue.enqueue(value()); queue.dispose(); report.mockClear();
    resolve(saved(value())); await flushing;
    expect(report).not.toHaveBeenCalled(); expect(save).toHaveBeenCalledTimes(1);
  });
});
