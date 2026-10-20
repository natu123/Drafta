import type { Note } from './types';

export type ListStyle = 'top' | 'bottom';

/** For a new workspace without a saved setting; saved settings are kept (AGENTS.md, List Style). */
export const DEFAULT_LIST_STYLE: ListStyle = 'bottom';

/** The initial samples were ordered for Add to Top (newest first); turn them to the default style. */
export function initialSampleOrder(notes: Note[]): Note[] {
  const newestFirst = [...notes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return notesForListStyle(newestFirst, 'top', DEFAULT_LIST_STYLE);
}

/**
 * Switching the list style mirrors every tray, so the newest memos move to the side where new
 * memos are added while a manual order is kept, only reversed (AGENTS.md, List Style).
 * Trays and pinned memos are filtered from this one array, so reversing it reverses each of them.
 */
export function notesForListStyle(notes: Note[], from: ListStyle, to: ListStyle): Note[] {
  return from === to ? notes : [...notes].reverse();
}
