import type { Group, Note } from './types';

/**
 * The "All memos" view (AGENTS.md, All Memos). It is not a stored tray: stored IDs never contain
 * ':' (workspace-backup), so it cannot clash with one.
 */
export const ALL_MEMOS = ':all';

/** Every memo in a live tray, by last edit; the newest sits where the list opens (top, or bottom in the chat style). */
export function allMemos(notes: Note[], groups: Group[], listStyle: 'top' | 'bottom'): Note[] {
  const trays = new Set(groups.filter(group => !group.isDeleted && group.type !== 'separator').map(group => group.id));
  const time = (note: Note) => Date.parse(note.updatedAt) || 0;
  const newestFirst = notes
    .filter(note => !note.isDeleted && note.type !== 'separator' && trays.has(note.group))
    .map((note, index) => ({ note, index }))
    .sort((a, b) => time(b.note) - time(a.note) || a.index - b.index)
    .map(item => item.note);
  return listStyle === 'bottom' ? newestFirst.reverse() : newestFirst;
}
