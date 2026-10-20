import type { Group, Note } from './types';

const newestFirst = (a: Note, b: Note) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

/**
 * Every matching memo, without a cap: title matches first, then body-only matches, each newest
 * first (AGENTS.md, Search). The list scrolls, so a common word never hides a title match.
 */
export function searchNotes(notes: Note[], query: string): Note[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  const candidates = notes.filter(note => !note.isDeleted && note.type !== 'separator');
  const inTitle = candidates.filter(note => note.title.toLowerCase().includes(term));
  const titled = new Set(inTitle);
  const inBody = candidates.filter(note => !titled.has(note) && Boolean(note.plainTextContent?.toLowerCase().includes(term)));
  return [...inTitle.sort(newestFirst), ...inBody.sort(newestFirst)];
}

export function searchGroups(groups: Group[], query: string): Group[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return groups.filter(group => !group.isDeleted && group.type !== 'separator' && group.name.toLowerCase().includes(term));
}
