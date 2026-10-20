import type { Note } from './types';

export type ListStyle = 'top' | 'bottom';

/**
 * Switching the list style mirrors every tray, so the newest memos move to the side where new
 * memos are added while a manual order is kept, only reversed (AGENTS.md, List Style).
 * Trays and pinned memos are filtered from this one array, so reversing it reverses each of them.
 */
export function notesForListStyle(notes: Note[], from: ListStyle, to: ListStyle): Note[] {
  return from === to ? notes : [...notes].reverse();
}
