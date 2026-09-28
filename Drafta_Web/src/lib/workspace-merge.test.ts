import { describe, expect, it } from 'vitest';
import { mergeWorkspaces, preserveWorkspaceCopy } from './workspace-merge';
import type { WorkspaceBackup } from './workspace-backup';

const now = '2026-09-28T00:00:00.000Z';
const fresh = (): WorkspaceBackup => ({
  format: 'drafta-workspace', version: 1, exportedAt: now,
  groups: [{ id: 'g1', name: 'One', type: 'group' }, { id: 'g2', name: 'Two', type: 'group' }],
  settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' },
  notes: ['a', 'b', 'c'].map(id => ({ id, group: 'g1', stars: 0, createdAt: now, updatedAt: now,
    document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [
      { type: 'title', content: [{ type: 'text', text: id }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'original' }] },
    ] } },
  })),
});
const edit = (value: WorkspaceBackup, index: number, text: string) => { value.notes[index].document.document.content![1].content![0].text = text; };
const merge = (base: WorkspaceBackup, local: WorkspaceBackup, remote: WorkspaceBackup) => {
  let id = 0;
  return mergeWorkspaces(base, local, remote, { now, copySuffix: 'Conflict copy', newId: () => `copy-${++id}` });
};
describe('three-way workspace merge', () => {
  it('preserves both complete workspaces after explicit structural review', () => {
    const local = fresh(), remote = fresh();
    local.notes[1].parentId = 'a'; edit(local, 0, 'Keep local content');
    remote.notes = []; remote.groups[0].isDeleted = true;
    const before = JSON.stringify([local, remote]); let counter = 0;
    const recovered = preserveWorkspaceCopy(local, remote, { now, copySuffix: 'Recovered', newId: () => `recovered-${++counter}` });
    expect(recovered.groups).toHaveLength(4);
    expect(recovered.notes).toHaveLength(3);
    expect(recovered.notes[1].parentId).toBe(recovered.notes[0].id);
    expect(recovered.notes[0].group).toBe(recovered.groups[2].id);
    expect(recovered.notes[0].document).toEqual(local.notes[0].document);
    expect(recovered.settings).toEqual(remote.settings);
    expect(JSON.stringify([local, remote])).toBe(before);
  });
  it('combines edits to different memos without modifying any source', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    edit(local, 0, 'local'); edit(remote, 1, 'remote');
    const inputs = JSON.stringify([base, local, remote]);
    const result = merge(base, local, remote);
    expect(result.kind).toBe('merged');
    if (result.kind !== 'merged') return;
    expect(result.backup.notes[0]).toEqual(local.notes[0]);
    expect(result.backup.notes[1]).toEqual(remote.notes[1]);
    expect(result.copies).toEqual([]);
    expect(JSON.stringify([base, local, remote])).toBe(inputs);
  });
  it('keeps the remote original and a complete local conflict copy', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    edit(local, 0, 'local'); edit(remote, 0, 'remote');
    const result = merge(base, local, remote);
    expect(result.kind).toBe('merged');
    if (result.kind !== 'merged') return;
    expect(result.backup.notes.map(note => note.id)).toEqual(['a', 'copy-1', 'b', 'c']);
    expect(result.backup.notes[0]).toEqual(remote.notes[0]);
    expect(result.backup.notes[1].document.document.content![1]).toEqual(local.notes[0].document.document.content![1]);
    expect(result.backup.notes[1].document.document.content![0].content?.at(-1)?.text).toBe(' (Conflict copy)');
  });
  it('does not duplicate identical edits or timestamp-only differences', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    edit(local, 0, 'same'); edit(remote, 0, 'same');
    local.notes[0].updatedAt = '2026-09-28T01:00:00.000Z';
    const result = merge(base, local, remote);
    expect(result.kind === 'merged' && result.copies).toEqual([]);
  });
  it('combines independent additions and unilateral reorder', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    local.notes = [local.notes[2], local.notes[0], local.notes[1], { ...local.notes[1], id: 'new-local' }];
    remote.notes.push({ ...remote.notes[1], id: 'new-remote' });
    const result = merge(base, local, remote);
    expect(result.kind === 'merged' && result.backup.notes.map(note => note.id)).toEqual(['c', 'a', 'b', 'new-local', 'new-remote']);
  });
  it('preserves an uncontested deletion', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    local.notes.shift(); edit(remote, 1, 'remote');
    const result = merge(base, local, remote);
    expect(result.kind === 'merged' && result.backup.notes.map(note => note.id)).toEqual(['b', 'c']);
  });
  it.each(['hard', 'soft'])('requires review for %s deletion versus edits', mode => {
    const base = fresh(), local = fresh(), remote = fresh();
    if (mode === 'hard') local.notes.shift(); else local.notes[0].isDeleted = true;
    edit(remote, 0, 'remote');
    expect(merge(base, local, remote)).toEqual({ kind: 'review', reasons: ['deletion-conflict'] });
  });
  it('requires review when a tray is deleted while its memo is edited', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    edit(local, 0, 'local'); remote.groups[0].isDeleted = true;
    expect(merge(base, local, remote)).toEqual({ kind: 'review', reasons: ['deletion-conflict'] });
  });
  it('requires review for conflicting tray edits and reorders', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    local.groups[0].name = 'local'; remote.groups[0].name = 'remote';
    expect(merge(base, local, remote).kind).toBe('review');
    local.groups = base.groups; remote.groups = base.groups;
    local.notes.reverse(); remote.notes = [remote.notes[1], remote.notes[0], remote.notes[2]];
    expect(merge(base, local, remote)).toEqual({ kind: 'review', reasons: ['order-conflict'] });
  });
  it('merges different settings and requires review for the same setting', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    local.settings.theme = 'dark'; remote.settings.language = 'ja';
    const result = merge(base, local, remote);
    expect(result.kind === 'merged' && result.backup.settings).toMatchObject({ theme: 'dark', language: 'ja' });
    remote.settings.theme = 'light';
    expect(merge(base, local, remote)).toEqual({ kind: 'review', reasons: ['settings-conflict'] });
  });
  it('rejects a duplicate conflict-copy ID without losing either source', () => {
    const base = fresh(), local = fresh(), remote = fresh();
    edit(local, 0, 'local'); edit(remote, 0, 'remote');
    expect(mergeWorkspaces(base, local, remote, { now, copySuffix: 'copy', newId: () => 'b' })).toEqual({ kind: 'review', reasons: ['invalid-result'] });
  });
});
