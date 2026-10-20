import { describe, expect, it } from 'vitest';
import { DEFAULT_LIST_STYLE, initialSampleOrder, notesForListStyle } from './list-style';
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

describe('the default list style', () => {
  it('starts new workspaces in the chat style with the newest sample at the bottom', () => {
    const samples = [{ ...note('old', 'a'), createdAt: '2026-01-01T00:00:00.000Z' }, { ...note('new', 'a'), createdAt: '2026-02-01T00:00:00.000Z' }, { ...note('mid', 'a'), createdAt: '2026-01-15T00:00:00.000Z' }];
    expect(DEFAULT_LIST_STYLE).toBe('bottom');
    expect(initialSampleOrder(samples).map(item => item.id)).toEqual(['old', 'mid', 'new']);
  });
});
