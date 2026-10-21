/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { heldEditsMerge } from './held-edits';
import { summarizeNote } from './note-summary';
import { attachBody } from './note-source';
import { mergeWorkspaces } from './workspace-merge';
import { parseStoredDocument, type BackupNote, type WorkspaceBackup } from './workspace-backup';
import { noteWithContent, summariesToState, type WorkspaceState } from './workspace-state';
import type { PartialWorkspace } from './cloud-workspace';

const date = '2026-10-21T00:00:00.000Z';
const memo = (id: string, text: string, extra: Partial<BackupNote> = {}): BackupNote => ({ id, group: 'tray', stars: 0, createdAt: date, updatedAt: date, ...extra,
  document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'title', content: [{ type: 'text', text: id }] }, { type: 'paragraph', content: [{ type: 'text', text }] }] } } });
const workspace = (notes: BackupNote[]): WorkspaceBackup => ({ format: 'drafta-workspace', version: 1, exportedAt: date, groups: [{ id: 'tray', name: 'Tray' }], notes, settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' } });
const start = workspace([memo('a', 'one'), memo('b', 'two'), memo('c', 'three'), memo('d', 'four')]);

// A new device: the list from summaries, then bodies arrive (all but `missing`).
function device(missing: string[] = [], arrived: Record<string, BackupNote> = {}) {
  const { notes, ...envelope } = structuredClone(start);
  const partial: PartialWorkspace = { uid: 'u', revision: 1, since: null, envelope, summaries: notes.map(summarizeNote) };
  const seed = summariesToState(envelope, partial.summaries);
  seed.notes.forEach((note, index) => {
    if (!missing.includes(note.id)) attachBody(note.source!, parseStoredDocument(JSON.stringify((arrived[note.id] ?? notes[index]).document), note.id));
  });
  return { partial, seed };
}
const edit = (state: WorkspaceState, id: string, change: (note: WorkspaceState['notes'][number]) => WorkspaceState['notes'][number]) =>
  ({ ...state, notes: state.notes.map(note => note.id === id ? change(note) : note) });
const typed = (state: WorkspaceState, id: string, text: string) => edit(state, id, note => ({ ...noteWithContent(note, document), content: `<p>${text}</p>` }));
const merge = (partial: PartialWorkspace, seed: WorkspaceState, local: WorkspaceState, remote: WorkspaceBackup, changed: ReadonlySet<string> | 'all') => {
  const held = heldEditsMerge({ partial, seed, local, remote, changed, dom: document });
  return mergeWorkspaces(held.base, held.local, remote, { newId: () => 'copy', copySuffix: 'copy', now: date });
};
const bodyText = (backup: WorkspaceBackup, id: string) => JSON.stringify(backup.notes.find(note => note.id === id)?.document ?? null);

describe('edits made while bodies arrive (specs/17, 0.8.1)', () => {
  it('saves them as they are when no other device saved meanwhile', () => {
    const { partial, seed } = device();
    const local = edit(typed(seed, 'a', 'edited here'), 'b', note => ({ ...note, isPinned: true }));
    const result = merge(partial, seed, local, start, new Set());
    expect(result.kind).toBe('merged');
    if (result.kind !== 'merged') return;
    expect(bodyText(result.backup, 'a')).toContain('edited here');
    expect(result.backup.notes.find(note => note.id === 'b')?.isPinned).toBe(true);
    expect(bodyText(result.backup, 'c')).toBe(bodyText(start, 'c'));
    expect(result.copies).toEqual([]);
  });

  it('keeps another device’s edits and deletions of memos left untouched here', () => {
    const { partial, seed } = device();
    const local = edit(typed(seed, 'a', 'edited here'), 'b', note => ({ ...note, isPinned: true }));
    const remote = workspace([memo('a', 'one'), memo('b', 'two'), memo('c', 'changed there', { updatedAt: '2026-10-21T01:00:00.000Z' })]);
    const result = merge(partial, seed, local, remote, new Set(['c', 'd']));
    expect(result.kind).toBe('merged');
    if (result.kind !== 'merged') return;
    expect(result.backup.notes.map(note => note.id)).toEqual(['a', 'b', 'c']);
    expect(bodyText(result.backup, 'a')).toContain('edited here');
    expect(bodyText(result.backup, 'c')).toContain('changed there');
    expect(result.copies).toEqual([]);
  });

  it('keeps both versions of a memo changed here and on another device', () => {
    const { partial, seed } = device();
    const local = typed(seed, 'a', 'edited here');
    const remote = workspace([memo('a', 'edited there', { updatedAt: '2026-10-21T01:00:00.000Z' }), memo('b', 'two'), memo('c', 'three'), memo('d', 'four')]);
    const result = merge(partial, seed, local, remote, new Set(['a']));
    expect(result.kind).toBe('merged');
    if (result.kind !== 'merged') return;
    expect(bodyText(result.backup, 'a')).toContain('edited there');
    expect(result.copies).toEqual([{ originalId: 'a', copyId: 'copy' }]);
    expect(bodyText(result.backup, 'copy')).toContain('edited here');
  });

  it('lets a memo deleted elsewhere before its body arrived stay deleted', () => {
    const { partial, seed } = device(['d']);
    const local = typed(seed, 'a', 'edited here');
    const remote = workspace([memo('a', 'one'), memo('b', 'two'), memo('c', 'three')]);
    const result = merge(partial, seed, local, remote, new Set(['d']));
    expect(result.kind === 'merged' && result.backup.notes.map(note => note.id)).toEqual(['a', 'b', 'c']);
  });

  it('takes another device’s version when the newer body arrived for an untouched memo', () => {
    const newer = memo('c', 'changed there', { updatedAt: '2026-10-21T01:00:00.000Z' });
    const { partial, seed } = device([], { c: newer });
    const local = typed(seed, 'a', 'edited here');
    const remote = workspace([memo('a', 'one'), memo('b', 'two'), newer, memo('d', 'four')]);
    const result = merge(partial, seed, local, remote, new Set(['c']));
    expect(result.kind).toBe('merged');
    if (result.kind !== 'merged') return;
    expect(result.backup.notes.find(note => note.id === 'c')).toEqual(newer);
    expect(result.copies).toEqual([]);
  });
});
