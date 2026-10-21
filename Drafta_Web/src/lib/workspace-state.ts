import type { JSONContent } from '@tiptap/core';
import type { Group, Note } from './types';
import { editorDocumentToHtml } from './document-codec';
import { BackupValidationError, isTrustedBackup, parseTrustedWorkspaceBackup, type BackupNote, type BackupSettings, type WorkspaceBackup } from './workspace-backup';
import { createNoteSource, isLazyNote, LAZY_CONTENT, sourceOf } from './note-source';

export type WorkspaceState = { groups: Group[]; notes: Note[]; settings: BackupSettings };
export type WorkspaceUpdate = { sequence: number; state: WorkspaceState; copies: { originalId: string; copyId: string }[] };

function titleText(node: JSONContent): string {
  return (node.content ?? []).map(child => {
    if (child.type !== 'text' || typeof child.text !== 'string') throw new BackupValidationError('title', 'Unsupported title content');
    if (child.marks?.some(mark => mark.type !== 'textStyle')) throw new BackupValidationError('title', 'Unsupported title formatting');
    const color = child.marks?.find(mark => mark.type === 'textStyle')?.attrs?.color;
    if (!color) return child.text;
    let hex = String(color);
    const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(hex);
    if (rgb) hex = '#' + rgb.slice(1).map(value => Number(value).toString(16).padStart(2, '0')).join('');
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) throw new BackupValidationError('title', 'Unsupported title color');
    return `{color:${hex}}${child.text}{/color}`;
  }).join('');
}

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

// The same preview text as the HTML path, read straight from the stored document: the blocks
// that HTML follows with a space (p, div, li, h1-h3, pre) end with one here too.
const SPACED_BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'taskItem', 'codeBlock', 'tableCell', 'tableHeader']);
function previewText(value: BackupNote['document']): string {
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    if (typeof node.text === 'string') parts.push(node.text);
    node.content?.forEach(walk);
    if (node.type && SPACED_BLOCKS.has(node.type)) parts.push(' ');
  };
  value.document.content?.slice(1).forEach(walk);
  return parts.join('').replace(/\s+/g, ' ').trim();
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

/** The memo with its editor HTML, made from the stored document the first time it is opened. */
const openedBodies = new WeakMap<object, string>();
export function noteWithContent(note: Note, dom: Document): Note {
  if (!isLazyNote(note)) return note;
  const source = sourceOf(note);
  if (!source) throw new BackupValidationError(`notes.${note.id}`, 'Memo body is not loaded');
  let content = openedBodies.get(note.source!);
  if (content === undefined) { content = editorHtml(source.note.document, dom).content; openedBodies.set(note.source!, content); }
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
