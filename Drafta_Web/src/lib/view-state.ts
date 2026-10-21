import type { WorkspaceState } from './workspace-state';

/** What was open on this device for the account (AGENTS.md, View Restore). */
export type ViewState = { groupId: string; noteId: string | null; tabIds: string[]; pane: 'trays' | 'notes' | 'editor' };

const keyFor = (uid: string) => `drafta:view:v1:${uid}`;
const PANES = ['trays', 'notes', 'editor'] as const;

export function readViewState(uid: string): ViewState | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(keyFor(uid)) ?? 'null');
    if (!value || typeof value.groupId !== 'string' || (value.noteId !== null && typeof value.noteId !== 'string') ||
        !Array.isArray(value.tabIds) || value.tabIds.some((id: unknown) => typeof id !== 'string') || !PANES.includes(value.pane)) return null;
    return { groupId: value.groupId, noteId: value.noteId, tabIds: value.tabIds.slice(0, 50), pane: value.pane };
  } catch { return null; }
}

export function writeViewState(uid: string, view: ViewState) {
  try { window.localStorage.setItem(keyFor(uid), JSON.stringify({ ...view, tabIds: view.tabIds.slice(0, 50) })); } catch { /* A per-device convenience only. */ }
}

export function clearViewState(uid: string) {
  try { window.localStorage.removeItem(keyFor(uid)); } catch { /* A per-device convenience only. */ }
}

/** Keeps only what still exists in the workspace; anything else falls back to the defaults. */
export function restoreView(saved: ViewState | null, state: WorkspaceState): ViewState | null {
  if (!saved) return null;
  const trays = new Set(state.groups.filter(group => !group.isDeleted && group.type !== 'separator').map(group => group.id));
  const memos = new Map(state.notes.filter(note => !note.isDeleted && note.type !== 'separator' && trays.has(note.group)).map(note => [note.id, note]));
  const groupId = saved.groupId === 'restore' || trays.has(saved.groupId) ? saved.groupId : null;
  if (!groupId) return null;
  const noteId = saved.noteId && memos.has(saved.noteId) ? saved.noteId : null;
  const tabIds = saved.tabIds.filter(id => memos.has(id));
  if (noteId && !tabIds.includes(noteId)) tabIds.push(noteId);
  const pane = saved.pane === 'editor' && !noteId ? 'notes' : saved.pane;
  return { groupId, noteId, tabIds, pane };
}
