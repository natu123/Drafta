import { describe, expect, it } from 'vitest';
import { searchGroups, searchNotes } from './global-search';
import type { Group, Note } from './types';

const note = (id: string, title: string, body: string, updatedAt: string, extra: Partial<Note> = {}) =>
  ({ id, title, content: '', plainTextContent: body, group: 'g', stars: 0, createdAt: updatedAt, updatedAt, ...extra }) as Note;

describe('global search', () => {
  it('shows every match with title matches first, each newest first', () => {
    // More than the old cap of 10 body matches, saved before the title match.
    const body = Array.from({ length: 15 }, (_, index) => note(`b${index}`, `Log ${index}`, 'played overwatch', `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`));
    const notes = [...body, note('older-title', 'Overwatch notes', '', '2026-01-01T00:00:00.000Z'), note('title', 'Overwatch Pick & Training', 'picks', '2026-05-31T00:00:00.000Z'),
      note('gone', 'Overwatch', '', '2026-10-20T00:00:00.000Z', { isDeleted: true }), note('sep', 'Overwatch', '', '2026-10-20T00:00:00.000Z', { type: 'separator' })];
    const results = searchNotes(notes, '  OVERWATCH ');
    expect(results).toHaveLength(17);
    expect(results.slice(0, 2).map(item => item.id)).toEqual(['title', 'older-title']);
    expect(results.slice(2, 4).map(item => item.id)).toEqual(['b14', 'b13']);
    expect(searchNotes(notes, ' ')).toEqual([]);
  });

  it('lists every matching tray', () => {
    const groups = Array.from({ length: 7 }, (_, index) => ({ id: `t${index}`, name: `Work ${index}`, type: 'group' }) as Group);
    expect(searchGroups([...groups, { id: 'x', name: 'Work old', type: 'group', isDeleted: true } as Group], 'work')).toHaveLength(7);
  });
});
