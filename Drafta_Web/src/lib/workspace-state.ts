import type { Group, Note } from './types';
import { editorDocumentToHtml } from './document-codec';
import { BackupValidationError, isTrustedBackup, parseTrustedWorkspaceBackup, type BackupNote, type BackupSettings, type WorkspaceBackup } from './workspace-backup';
import { createNoteSource, isLazyNote, LAZY_CONTENT, sourceOf } from './note-source';
import { previewText, titleText } from './note-text';
import { noteMetadata, type NoteSummary, type WorkspaceEnvelope } from './note-summary';

export type WorkspaceState = { groups: Group[]; notes: Note[]; settings: BackupSettings };
export type WorkspaceUpdate = { sequence: number; state: WorkspaceState; copies: { originalId: string; copyId: string }[] };

// One validation, in the trusted parse that follows.
function stringifyBackup(value: WorkspaceBackup): string {
  try { return JSON.stringify(value); } catch { throw new BackupValidationError('backup', 'Cannot serialize backup'); }
}

function editorHtml(value: BackupNote['document'], dom: Document) {
  const template = dom.createElement('template');
  template.innerHTML = editorDocumentToHtml(value, dom);
  template.content.firstElementChild!.remove();
  const content = template.innerHTML;
  // Preview is derived; preserve spacing between block elements.
  template.content.querySelectorAll('p,div,li,h1,h2,h3,pre').forEach(element => element.after(' '));
  const plainTextContent = (template.content.textContent ?? '').replace(/\s+/g, ' ').trim();
  return { content, plainTextContent };
}

/**
 * Validates before creating any HTML. Never changes app state or fetches URLs.
 * With `lazyBodies`, memos keep their stored document and get editor HTML only when opened
 * (noteWithContent); start-up then reads titles and preview text only (specs/17).
 */
export function workspaceToState(input: WorkspaceBackup, dom: Document, options: { lazyBodies?: boolean } = {}): WorkspaceState {
  const backup = isTrustedBackup(input) ? input : parseTrustedWorkspaceBackup(stringifyBackup(input));
  if (backup.settings.noteSort !== 'manual') throw new BackupValidationError('settings.noteSort', 'Only manual order is supported');
  const notes = backup.notes.map((stored): Note => {
    const { document: value, ...metadata } = stored;
    const title = titleText(value.document.content![0]);
    if (options.lazyBodies && !metadata.sampleKey) {
      return { ...JSON.parse(JSON.stringify(metadata)), title, content: LAZY_CONTENT, plainTextContent: previewText(value), source: createNoteSource(stored, title) };
    }
    return { ...JSON.parse(JSON.stringify(metadata)), title, ...editorHtml(value, dom) };
  });
  // The state is the app's to change; the stored backup stays as it was.
  return { groups: structuredClone(backup.groups), notes, settings: structuredClone(backup.settings) };
}

/**
 * The list before the bodies arrive (specs/17): every memo from its summary, unopened, with the
 * excerpt as preview text. Bodies are attached to the memos' tokens as they are read (attachBody).
 * Validated summaries only (validateSummaries); nothing here is saved.
 */
export function summariesToState(envelope: WorkspaceEnvelope, list: NoteSummary[]): WorkspaceState {
  if (envelope.settings.noteSort !== 'manual') throw new BackupValidationError('settings.noteSort', 'Only manual order is supported');
  const notes = list.map((summary): Note => {
    const metadata = noteMetadata(summary);
    return { ...structuredClone(metadata), title: summary.title, content: LAZY_CONTENT, plainTextContent: summary.excerpt, source: createNoteSource(Object.freeze(structuredClone(metadata)), summary.title) };
  });
  return { groups: structuredClone(envelope.groups), notes, settings: structuredClone(envelope.settings) };
}

/** The memo with its editor HTML, made from the stored document the first time it is opened. */
const openedBodies = new WeakMap<object, string>();
export function noteWithContent(note: Note, dom: Document): Note {
  if (!isLazyNote(note)) return note;
  const document = sourceOf(note)?.note.document;
  if (!document) throw new BackupValidationError(`notes.${note.id}`, 'Memo body is not loaded');
  let content = openedBodies.get(note.source!);
  if (content === undefined) { content = editorHtml(document, dom).content; openedBodies.set(note.source!, content); }
  return { ...note, content };
}

/**
 * Compares memo bodies across states. Two unopened memos compare their stored documents; an edited
 * memo against an unopened one makes HTML for that one memo only, as the editor would show it.
 */
export function sameNoteBody(a: Note | undefined, b: Note | undefined, dom: Document): boolean {
  if (!a || !b) return a === b;
  if (isLazyNote(a) && isLazyNote(b)) {
    const body = (note: Note) => JSON.stringify(sourceOf(note)?.note.document ?? null);
    return a.source === b.source || body(a) === body(b);
  }
  return noteWithContent(a, dom).content === noteWithContent(b, dom).content;
}
