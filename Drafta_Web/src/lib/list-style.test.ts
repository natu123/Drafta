import { describe, expect, it } from 'vitest';
import { notesForListStyle } from './list-style';
import type { Note } from './types';

const note = (id: string, group: string, isPinned = false) => ({ id, title: id, content: '', group, stars: 0, createdAt: '', updatedAt: '', isPinned }) as Note;
const order = (notes: Note[], group: string, pinned: boolean) => notes.filter(item => item.group === group && Boolean(item.isPinned) === pinned).map(item => item.id);

describe('switching the list style', () => {
  const notes = [note('a1', 'a'), note('b1', 'b'), note('a2', 'a', true), note('a3', 'a'), note('b2', 'b'), note('a4', 'a', true)];

  it('mirrors the pinned and regular memos of every tray', () => {
    const switched = notesForListStyle(notes, 'top', 'bottom');
    expect(order(switched, 'a', false)).toEqual(['a3', 'a1']);
    expect(order(switched, 'a', true)).toEqual(['a4', 'a2']);
    expect(order(switched, 'b', false)).toEqual(['b2', 'b1']);
    expect(notesForListStyle(switched, 'bottom', 'top')).toEqual(notes);
  });

  it('keeps the order when the style does not change', () => {
    expect(notesForListStyle(notes, 'top', 'top')).toBe(notes);
  });
});
