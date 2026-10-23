import { describe, expect, it } from 'vitest';
import { ALL_MEMOS, allMemos, trayForNewMemos } from './all-memos';
import type { Group, Note } from './types';

const memo = (id: string, group: string, updatedAt: string, extra: Partial<Note> = {}): Note =>
  ({ id, title: id, content: '', group, stars: 0, createdAt: updatedAt, updatedAt, ...extra });
const groups: Group[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'gone', name: 'Gone', isDeleted: true }, { id: 'sep', name: '', type: 'separator' }];
const notes = [
  memo('old-a', 'a', '2026-10-01T00:00:00.000Z'),
  memo('new-b', 'b', '2026-10-20T00:00:00.000Z'),
  memo('mid-a', 'a', '2026-10-10T00:00:00.000Z'),
  memo('line', 'a', '2026-10-30T00:00:00.000Z', { type: 'separator' }),
  memo('deleted', 'b', '2026-10-30T00:00:00.000Z', { isDeleted: true }),
  memo('in-deleted-tray', 'gone', '2026-10-30T00:00:00.000Z'),
];

describe('all memos view', () => {
  it('adds new memos to the tray chosen last time, or else the first live tray in the stored order', () => {
    expect(trayForNewMemos(groups, 'b')?.id).toBe('b');
    expect(trayForNewMemos(groups, 'gone')?.id).toBe('a');
    expect(trayForNewMemos(groups, 'missing')?.id).toBe('a');
    expect(trayForNewMemos(groups, null)?.id).toBe('a');
    expect(trayForNewMemos(groups)?.id).toBe('a');
    expect(trayForNewMemos([{ id: 'sep', name: '', type: 'separator' }, { id: 'gone', name: 'Gone', isDeleted: true }, { id: 'b', name: 'B', isPinned: true }])?.id).toBe('b');
    expect(trayForNewMemos([{ id: 'gone', name: 'Gone', isDeleted: true }])).toBeUndefined();
  });

  it('lists every memo in a live tray, newest first for the top style', () => {
    expect(allMemos(notes, groups, 'top').map(note => note.id)).toEqual(['new-b', 'mid-a', 'old-a']);
  });

  it('puts the newest at the bottom for the chat style', () => {
    expect(allMemos(notes, groups, 'bottom').map(note => note.id)).toEqual(['old-a', 'mid-a', 'new-b']);
  });

  it('keeps the stored order for memos edited at the same time', () => {
    const same = [memo('first', 'a', '2026-10-01T00:00:00.000Z'), memo('second', 'b', '2026-10-01T00:00:00.000Z')];
    expect(allMemos(same, groups, 'top').map(note => note.id)).toEqual(['first', 'second']);
  });

  it('can never be the ID of a stored tray', () => {
    expect(/^[A-Za-z0-9_-]{1,128}$/.test(ALL_MEMOS)).toBe(false);
  });
});
