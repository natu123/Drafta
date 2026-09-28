import { WorkspaceConflictError, WorkspaceStorageError, type SavedWorkspace } from './cloud-workspace';
import type { WorkspaceBackup } from './workspace-backup';

export type QueueStatus = 'pending' | 'saving' | 'saved' | 'error' | 'conflict';
type Save = (value: WorkspaceBackup, base: SavedWorkspace | null) => Promise<SavedWorkspace>;

/** One queue per authenticated workspace. Dispose before changing accounts. */
export class WorkspaceSaveQueue {
  private pending: WorkspaceBackup | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;
  private disposed = false;
  private stopped = false;
  private failures = 0;
  private state: QueueStatus;

  constructor(private base: SavedWorkspace | null, private save: Save, private report: (status: QueueStatus) => void) {
    this.state = base ? 'saved' : 'pending';
  }
  get dirty() { return this.pending !== null || this.running !== null; }
  get status() { return this.state; }
  private emit(status: QueueStatus) {
    if (!this.disposed) { this.state = status; this.report(status); }
  }
  private schedule(delay: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, delay);
  }
  enqueue(value: WorkspaceBackup) {
    if (this.disposed) return;
    // Detach from caller-owned state before any async boundary.
    this.pending = structuredClone(value);
    if (this.stopped) return;
    this.emit('pending');
    this.schedule(800);
  }
  flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.disposed || this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  private async drain() {
    while (this.pending && !this.disposed && !this.stopped) {
      const value = this.pending;
      this.pending = null;
      this.emit('saving');
      try {
        const saved = await this.save(value, this.base);
        if (this.disposed) return;
        this.base = saved;
        this.failures = 0;
      } catch (error) {
        if (this.disposed) return;
        // A newer edit wins the retry slot, but uses the same acknowledged base.
        this.pending ??= value;
        this.failures++;
        const conflict = error instanceof WorkspaceConflictError;
        this.stopped = conflict || error instanceof WorkspaceStorageError || this.failures > 3;
        this.emit(conflict ? 'conflict' : 'error');
        if (!this.stopped) this.schedule(1000 * 2 ** (this.failures - 1));
        return;
      }
    }
    if (!this.disposed && !this.pending) this.emit('saved');
  }
  retry() {
    if (this.disposed || this.state === 'conflict') return Promise.resolve();
    this.stopped = false;
    this.failures = 0;
    return this.flush();
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.pending = null;
  }
}
