import type { Group, Note } from './types';

const newestFirst = (a: Note, b: Note) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

/**
 * Every memo matching the title or body, without a cap, newest first (AGENTS.md, Search).
 * The list scrolls, so a common word never hides the memo being looked for.
 */
export function searchNotes(notes: Note[], query: string): Note[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return notes
    .filter(note => !note.isDeleted && note.type !== 'separator')
    .filter(note => note.title.toLowerCase().includes(term) || Boolean(note.plainTextContent?.toLowerCase().includes(term)))
    .sort(newestFirst);
}

export function searchGroups(groups: Group[], query: string): Group[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return groups.filter(group => !group.isDeleted && group.type !== 'separator' && group.name.toLowerCase().includes(term));
}
