import type { JSONContent } from '@tiptap/core';
import type { SerializedEditorDocument } from './document-codec';
import { BackupValidationError } from './workspace-backup';

/** The memo's title as the app shows it, with `{color:#hex}…{/color}` for colored runs. */
export function titleText(node: JSONContent): string {
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

/** Characters of preview text a memo card shows (one line, cut off by CSS). */
export const PREVIEW_CHARACTERS = 300;

// The same preview text as the HTML path, read straight from the stored document: the blocks
// that HTML follows with a space (p, div, li, h1-h3, pre) end with one here too.
const SPACED_BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'taskItem', 'codeBlock', 'tableCell', 'tableHeader']);
// The body's text in reading order; `visit` returns true to stop.
function walkText(value: SerializedEditorDocument, visit: (text: string) => boolean): void {
  const walk = (node: JSONContent): boolean => {
    if (typeof node.text === 'string' && visit(node.text)) return true;
    for (const child of node.content ?? []) if (walk(child)) return true;
    return Boolean(node.type && SPACED_BLOCKS.has(node.type) && visit(' '));
  };
  for (const node of value.document.content?.slice(1) ?? []) if (walk(node)) return;
}
export function previewText(value: SerializedEditorDocument): string {
  const parts: string[] = [];
  walkText(value, text => { parts.push(text); return false; });
  return parts.join('').replace(/\s+/g, ' ').trim();
}
/**
 * The first `count` characters (code points) of previewText, reading only as much of the memo as
 * they need: a summary's excerpt of a long memo no longer walks the whole memo (specs/17).
 */
export function previewTextStart(value: SerializedEditorDocument, count: number): string {
  let text = '';
  let stopped = false;
  walkText(value, part => {
    let piece = part.replace(/\s+/g, ' ');
    // Whitespace runs collapse across pieces too, and leading whitespace is trimmed.
    if ((!text || text.endsWith(' ')) && piece.startsWith(' ')) piece = piece.slice(1);
    text += piece;
    // More than 2 × count UTF-16 units hold more than count code points, so the end trim cannot reach them.
    stopped = text.length > count * 2 + 1;
    return stopped;
  });
  return Array.from(stopped ? text : text.trimEnd()).slice(0, count).join('');
}
