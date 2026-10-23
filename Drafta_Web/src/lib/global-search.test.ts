/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { searchGroups, searchNotes } from './global-search';
import { groups, notes } from './data';
import { isLazyNote } from './note-source';
import { createWorkspaceBackup } from './workspace-backup';
import { workspaceToState } from './workspace-state';
import type { Group, Note } from './types';

const note = (id: string, title: string, body: string, updatedAt: string, extra: Partial<Note> = {}) =>
  ({ id, title, content: '', plainTextContent: body, group: 'g', stars: 0, createdAt: updatedAt, updatedAt, ...extra }) as Note;

describe('global search', () => {
  it('shows every match, newest first', () => {
    // More than the old cap of 10 body matches, saved before the title match.
    const body = Array.from({ length: 15 }, (_, index) => note(`b${index}`, `Log ${index}`, 'played overwatch', `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`));
    const notes = [...body, note('older-title', 'Overwatch notes', '', '2026-01-01T00:00:00.000Z'), note('title', 'Overwatch Pick & Training', 'picks', '2026-05-31T00:00:00.000Z'),
      note('gone', 'Overwatch', '', '2026-10-20T00:00:00.000Z', { isDeleted: true }), note('sep', 'Overwatch', '', '2026-10-20T00:00:00.000Z', { type: 'separator' })];
    const results = searchNotes(notes, '  OVERWATCH ');
    expect(results).toHaveLength(17);
    expect(results.slice(0, 2).map(item => item.id)).toEqual(['b14', 'b13']);
    // Past the old cap of 10, and in update order rather than title-first.
    expect(results.map(item => item.id).slice(-3)).toEqual(['b0', 'title', 'older-title']);
    expect(searchNotes(notes, ' ')).toEqual([]);
  });

  it('finds words past the preview of a memo that was never opened', () => {
    const long = { ...notes[0], sampleKey: undefined, id: 'long', content: `<p>${'filler '.repeat(80)}</p><p>needle at the end</p>` };
    const backup = createWorkspaceBackup({ notes: [long], groups, settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' } }, document, '2026-10-23T00:00:00.000Z');
    const [lazy] = workspaceToState(backup, document, { lazyBodies: true }).notes;
    expect(isLazyNote(lazy)).toBe(true);
    expect(lazy.plainTextContent).not.toContain('needle');
    expect(searchNotes([lazy], 'NEEDLE').map(item => item.id)).toEqual(['long']);
  });

  it('lists every matching tray', () => {
    const groups = Array.from({ length: 7 }, (_, index) => ({ id: `t${index}`, name: `Work ${index}`, type: 'group' }) as Group);
    expect(searchGroups([...groups, { id: 'x', name: 'Work old', type: 'group', isDeleted: true } as Group], 'work')).toHaveLength(7);
  });
});
