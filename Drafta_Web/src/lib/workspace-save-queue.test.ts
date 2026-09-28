import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceSaveQueue } from './workspace-save-queue';
import { WorkspaceConflictError, type SavedWorkspace } from './cloud-workspace';
import type { WorkspaceBackup } from './workspace-backup';

const value = (): WorkspaceBackup => ({ format: 'drafta-workspace', version: 1, exportedAt: '2026-09-28T00:00:00.000Z', groups: [], notes: [], settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' } });
const saved = (backup: WorkspaceBackup, revision = 1): SavedWorkspace => ({ uid: 'alice', revision, backup });
afterEach(() => vi.useRealTimers());

describe('workspace autosave queue', () => {
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

  it('does not publish late results or write queued changes after disposal', async () => {
    let resolve!: (value: SavedWorkspace) => void;
    const save = vi.fn(() => new Promise<SavedWorkspace>(done => { resolve = done; }));
    const report = vi.fn(); const queue = new WorkspaceSaveQueue(null, save, report);
    queue.enqueue(value()); const flushing = queue.flush(); queue.enqueue(value()); queue.dispose(); report.mockClear();
    resolve(saved(value())); await flushing;
    expect(report).not.toHaveBeenCalled(); expect(save).toHaveBeenCalledTimes(1);
  });
});
