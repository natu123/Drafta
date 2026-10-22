import type { WorkspaceState } from './workspace-state';

/**
 * Tells whether memos or trays differ from the first state it saw, so leaving the Playground asks
 * first (AGENTS.md, Playground). Opening a memo changes nothing, and lastAccessedAt does not count;
 * neither do language, theme or list style settings. Once changed, it stays changed.
 */
export function playgroundChangeWatcher() {
  let first: string | null = null;
  let changed = false;
  return (state: Pick<WorkspaceState, 'notes' | 'groups'>): boolean => {
    if (changed) return true;
    const text = JSON.stringify([state.notes.map(note => ({ ...note, lastAccessedAt: undefined })), state.groups]);
    if (first === null) first = text;
    changed = text !== first;
    return changed;
  };
}
