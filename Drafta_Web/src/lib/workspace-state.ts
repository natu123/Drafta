import type { JSONContent } from '@tiptap/core';
import type { Group, Note } from './types';
import { editorDocumentToHtml } from './document-codec';
import { BackupValidationError, parseWorkspaceBackup, serializeWorkspaceBackup, type BackupSettings, type WorkspaceBackup } from './workspace-backup';

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

/** Validates before creating any HTML. Never changes app state or fetches URLs. */
export function workspaceToState(input: WorkspaceBackup, dom: Document): WorkspaceState {
  const backup = parseWorkspaceBackup(serializeWorkspaceBackup(input));
  if (backup.settings.noteSort !== 'manual') throw new BackupValidationError('settings.noteSort', 'Only manual order is supported');
  const notes = backup.notes.map(({ document: value, ...metadata }): Note => {
    const title = titleText(value.document.content![0]);
    const template = dom.createElement('template');
    template.innerHTML = editorDocumentToHtml(value, dom);
    template.content.firstElementChild!.remove();
    const content = template.innerHTML;
    // Preview is derived; preserve spacing between block elements.
    template.content.querySelectorAll('p,div,li,h1,h2,h3,pre').forEach(element => element.after(' '));
    const plainTextContent = (template.content.textContent ?? '').replace(/\s+/g, ' ').trim();
    return { ...metadata, title, content, plainTextContent };
  });
  return { groups: backup.groups, notes, settings: backup.settings };
}
