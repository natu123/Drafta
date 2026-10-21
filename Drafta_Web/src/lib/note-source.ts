import type { BackupNote } from './workspace-backup';
import type { Note } from './types';

/**
 * `content` of a memo whose editor HTML has not been made yet (specs/17). Its body is the stored
 * document behind `note.source`; saving reuses that document, and a memo without one is never saved.
 */
export const LAZY_CONTENT = '\u0000drafta-lazy-body';

export type NoteSource = { note: BackupNote; title: string };
const sources = new WeakMap<object, NoteSource>();

let issued = 0;
/**
 * A token kept on the memo; spreads keep it, and it points at the stored memo. Its number shows in
 * JSON, so a memo that now points at another stored body never looks unchanged to the save check.
 */
export function createNoteSource(note: BackupNote, title: string): object {
  const token = Object.freeze({ body: ++issued });
  sources.set(token, { note, title });
  return token;
}

export function sourceOf(note: Pick<Note, 'source'>): NoteSource | undefined {
  return note.source ? sources.get(note.source) : undefined;
}

export const isLazyNote = (note: Pick<Note, 'content'>) => note.content === LAZY_CONTENT;
