import type { JSONContent } from '@tiptap/core';
import type { WorkspaceBackup } from './workspace-backup';

function structure(node: JSONContent): unknown {
  return { type: node.type, attrs: node.attrs, marks: node.marks,
    content: (node.content ?? []).filter(child => child.type !== 'text').map(structure) };
}

/** Text changes debounce; structure, ordering, metadata and settings save now. */
export function requiresImmediateSave(previous: WorkspaceBackup | null, next: WorkspaceBackup): boolean {
  if (!previous) return true;
  if (JSON.stringify(previous.groups) !== JSON.stringify(next.groups) ||
      JSON.stringify(previous.settings) !== JSON.stringify(next.settings) ||
      previous.notes.length !== next.notes.length) return true;
  return next.notes.some((note, index) => {
    const old = previous.notes[index];
    if (note === old) return false; // Snapshots share unchanged, frozen memos.
    const { document, updatedAt: _updatedAt, ...metadata } = note;
    const { document: oldDocument, updatedAt: _oldUpdatedAt, ...oldMetadata } = old;
    void _updatedAt; void _oldUpdatedAt;
    return JSON.stringify(metadata) !== JSON.stringify(oldMetadata) ||
      JSON.stringify(structure(document.document)) !== JSON.stringify(structure(oldDocument.document));
  });
}
