import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { playgroundChangeWatcher } from './playground';
import { playgroundCopy } from './playground-copy';
import type { Group, Note } from './types';

const groups: Group[] = [{ id: 'inbox', name: 'Inbox' }];
const memo: Note = { id: 'a', title: 'A', content: '<p>a</p>', group: 'inbox', stars: 0, createdAt: '2026-10-21T00:00:00.000Z', updatedAt: '2026-10-21T00:00:00.000Z' };

describe('playground', () => {
  it('asks before leaving only after memos or trays changed', () => {
    const watch = playgroundChangeWatcher();
    expect(watch({ notes: [memo], groups })).toBe(false);
    // Opening a memo records when it was opened; that alone is not a change.
    expect(watch({ notes: [{ ...memo, lastAccessedAt: '2026-10-21T01:00:00.000Z' }], groups })).toBe(false);
    expect(watch({ notes: [{ ...memo, content: '<p>edited</p>' }], groups })).toBe(true);
    // Undoing the edit still asks: something was typed here.
    expect(watch({ notes: [memo], groups })).toBe(true);
    const trays = playgroundChangeWatcher();
    trays({ notes: [memo], groups });
    expect(trays({ notes: [memo], groups: [...groups, { id: 'new', name: 'New' }] })).toBe(true);
  });

  it('has every word in all languages', () => {
    for (const lang of LANGS) {
      for (const value of Object.values(playgroundCopy[lang])) expect(value.trim().length, lang).toBeGreaterThan(0);
    }
    expect(playgroundCopy.ja.tryIt).toBe('ログインせずに試す');
  });
});
