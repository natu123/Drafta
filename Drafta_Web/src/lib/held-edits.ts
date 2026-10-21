import type { PartialWorkspace } from './cloud-workspace';
import { hasBody } from './note-source';
import { noteMetadata } from './note-summary';
import { snapshotWorkspace, type BackupNote, type WorkspaceBackup } from './workspace-backup';
import type { WorkspaceState } from './workspace-state';

/**
 * Edits made while the bodies of a new device arrive (specs/17, 0.8.1) are saved once the workspace
 * is whole, merged like any remote change. This is the three-way merge's base: the workspace as the
 * summaries showed it. A memo left untouched here is its own base, so another device's version
 * wins; a touched memo saved by no other device meanwhile has the server's version as its base. A
 * touched memo another device also saved has no known base body, so it differs from both sides and
 * the merge keeps both unless they are the same.
 */
export function heldEditsMerge(input: {
  partial: PartialWorkspace;
  seed: WorkspaceState;
  local: WorkspaceState;
  remote: WorkspaceBackup;
  /** Memos another device saved or deleted while the bodies arrived; 'all' when unknown. */
  changed: ReadonlySet<string> | 'all';
  dom: Document;
}): { base: WorkspaceBackup; local: WorkspaceBackup } {
  const seeded = new Map(input.seed.notes.map(note => [note.id, note]));
  const untouched = (id: string, note: unknown) => seeded.get(id) === note;
  // A memo whose body never arrived was deleted elsewhere first; it cannot be saved and stays deleted.
  const kept = input.local.notes.filter(hasBody);
  const local = snapshotWorkspace({ ...input.local, notes: kept }, input.dom);
  const localNotes = new Map(local.notes.map(note => [note.id, note]));
  const localObjects = new Map(kept.map(note => [note.id, note]));
  const remoteNotes = new Map(input.remote.notes.map(note => [note.id, note]));
  const changedElsewhere = (id: string) => input.changed === 'all' || input.changed.has(id);
  let unknown = 0;
  const notes = input.partial.summaries.map((summary): BackupNote => {
    const mine = localNotes.get(summary.id);
    if (mine && untouched(summary.id, localObjects.get(summary.id))) return mine;
    const theirs = remoteNotes.get(summary.id);
    if (theirs && !changedElsewhere(summary.id)) return theirs;
    // Never saved: a body no side has, so this memo counts as changed on both sides.
    return { ...noteMetadata(summary), document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [
      { type: 'title' }, { type: 'paragraph', content: [{ type: 'text', text: `unknown base ${summary.id} ${++unknown}` }] },
    ] } } };
  });
  return { base: { ...structuredClone(input.partial.envelope), notes }, local };
}
