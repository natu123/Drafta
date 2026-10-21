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

// The same preview text as the HTML path, read straight from the stored document: the blocks
// that HTML follows with a space (p, div, li, h1-h3, pre) end with one here too.
const SPACED_BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'taskItem', 'codeBlock', 'tableCell', 'tableHeader']);
export function previewText(value: SerializedEditorDocument): string {
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    if (typeof node.text === 'string') parts.push(node.text);
    node.content?.forEach(walk);
    if (node.type && SPACED_BLOCKS.has(node.type)) parts.push(' ');
  };
  value.document.content?.slice(1).forEach(walk);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
