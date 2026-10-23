import type { Group, Note } from './types';
import { isLazyNote, sourceOf } from './note-source';
import { previewText } from './note-text';
import { trustDocument } from './workspace-backup';

const newestFirst = (a: Note, b: Note) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

// An unopened memo carries only the start of its text, for its card (0.8.6); search reads the whole
// body from its stored document, once per document.
const bodyTexts = new WeakMap<object, string>();
function bodyText(note: Note): string {
  const document = isLazyNote(note) ? sourceOf(note)?.note.document : undefined;
  if (!document) return note.plainTextContent?.toLowerCase() ?? '';
  let text = bodyTexts.get(document);
  if (text === undefined) {
    try { trustDocument(document, `notes.${note.id}.document`); text = previewText(document).toLowerCase(); }
    catch { text = note.plainTextContent?.toLowerCase() ?? ''; }
    bodyTexts.set(document, text);
  }
  return text;
}

/**
 * Every memo matching the title or body, without a cap, newest first (AGENTS.md, Search).
 * The list scrolls, so a common word never hides the memo being looked for.
 */
export function searchNotes(notes: Note[], query: string): Note[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return notes
    .filter(note => !note.isDeleted && note.type !== 'separator')
    .filter(note => note.title.toLowerCase().includes(term) || bodyText(note).includes(term))
    .sort(newestFirst);
}

export function searchGroups(groups: Group[], query: string): Group[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return groups.filter(group => !group.isDeleted && group.type !== 'separator' && group.name.toLowerCase().includes(term));
}
