import { WorkspaceConflictError, WorkspaceStorageError, type SavedWorkspace } from './cloud-workspace';
import type { WorkspaceBackup } from './workspace-backup';
import type { WorkspaceMerge } from './workspace-merge';

export type QueueStatus = 'pending' | 'saving' | 'saved' | 'error' | 'conflict';
type Save = (value: WorkspaceBackup, base: SavedWorkspace | null) => Promise<SavedWorkspace>;
export type QueueSync = {
  load: () => Promise<SavedWorkspace | null>;
  merge: (base: WorkspaceBackup, local: WorkspaceBackup, remote: WorkspaceBackup) => WorkspaceMerge;
  apply: (backup: WorkspaceBackup, copies: { originalId: string; copyId: string }[]) => void;
  review: (remote: SavedWorkspace) => void;
};

/** One queue per authenticated workspace. Dispose before changing accounts. */
export class WorkspaceSaveQueue {
  private pending: WorkspaceBackup | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;
  private disposed = false;
  private stopped = false;
  private failures = 0;
  private state: QueueStatus;
  private deferredRemote: SavedWorkspace | null = null;

  constructor(private base: SavedWorkspace | null, private save: Save, private report: (status: QueueStatus) => void, private sync?: QueueSync) {
    this.state = base ? 'saved' : 'pending';
  }
  get dirty() { return this.pending !== null || this.running !== null; }
  get status() { return this.state; }
  acceptRemote(remote: SavedWorkspace) {
    if (this.disposed || !this.sync || (this.base && remote.uid !== this.base.uid)) return;
    if (this.base && remote.revision <= this.base.revision) return;
    if (this.running) { this.deferredRemote = remote; return; }
    if (this.reconcile(remote) && this.pending) this.schedule(0);
  }
  private reconcile(remote: SavedWorkspace): boolean {
    if (!this.sync || this.disposed || (this.base && remote.revision <= this.base.revision)) return true;
    if (this.stopped && this.state === 'conflict') { this.sync.review(remote); return false; }
    if (!this.base && this.pending) { this.stopped = true; this.emit('conflict'); this.sync.review(remote); return false; }
    const result = this.pending && this.base ? this.sync.merge(this.base.backup, this.pending, remote.backup) : { kind: 'merged' as const, backup: remote.backup, copies: [] };
    if (result.kind === 'review') { this.stopped = true; this.emit('conflict'); this.sync.review(remote); return false; }
    const hadPending = this.pending !== null;
    this.base = remote;
    this.pending = hadPending ? result.backup : null;
    this.stopped = false;
    this.failures = 0;
    this.sync.apply(result.backup, result.copies);
    this.emit(this.pending ? 'pending' : 'saved');
    return true;
  }
  private emit(status: QueueStatus) {
    if (!this.disposed) { this.state = status; this.report(status); }
  }
  private schedule(delay: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, delay);
  }
  enqueue(value: WorkspaceBackup, immediate = false) {
    if (this.disposed) return;
    // Detach from caller-owned state before any async boundary.
    this.pending = structuredClone(value);
    if (this.stopped) return;
    this.emit('pending');
    if (immediate) void this.flush();
    else this.schedule(800);
  }
  flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.disposed || this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.drain().finally(() => {
      this.running = null;
      if (this.deferredRemote && !this.disposed) {
        const remote = this.deferredRemote; this.deferredRemote = null;
        this.reconcile(remote);
      }
      // A blur may start an empty flush just before React enqueues a new edit.
      if (this.pending && !this.disposed && !this.stopped && this.state === 'pending') this.schedule(0);
    });
    return this.running;
  }
  private async drain() {
    let reconciliations = 0;
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
        if (error instanceof WorkspaceConflictError && this.sync && reconciliations++ < 3) {
          try {
            const remote = await this.sync.load();
            if (this.disposed) return;
            if (remote && this.reconcile(remote)) continue;
          } catch { /* Keep the unsaved candidate and use the ordinary retry path. */ }
        }
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
    this.deferredRemote = null;
  }
}
