/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { clearViewState, readViewState, restoreView, writeViewState, type ViewState } from './view-state';
import type { WorkspaceState } from './workspace-state';
import type { Note } from './types';
import { ALL_MEMOS } from './all-memos';

const note = (id: string, group: string, extra: Partial<Note> = {}) => ({ id, title: id, content: '', group, stars: 0, createdAt: '', updatedAt: '', ...extra }) as Note;
const state = { groups: [{ id: 'inbox', name: 'Inbox', type: 'group' }, { id: 'work', name: 'Work', type: 'group' }, { id: 'old', name: 'Old', type: 'group', isDeleted: true }],
  notes: [note('a', 'inbox'), note('b', 'work'), note('gone', 'work', { isDeleted: true }), note('orphan', 'old')], settings: { language: null, theme: 'system', listStyle: 'bottom', noteSort: 'manual' } } as unknown as WorkspaceState;
const view = (extra: Partial<ViewState> = {}): ViewState => ({ groupId: 'work', noteId: 'b', tabIds: ['a', 'b'], pane: 'editor', ...extra });

describe('view restore', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('keeps the view per account on this device and clears it', () => {
    writeViewState('alice', view());
    writeViewState('bob', view({ groupId: 'inbox', noteId: null, tabIds: [], pane: 'notes' }));
    expect(readViewState('alice')).toEqual(view());
    expect(readViewState('bob')?.groupId).toBe('inbox');
    clearViewState('alice');
    expect(readViewState('alice')).toBeNull();
    expect(readViewState('bob')).not.toBeNull();
  });

  it('ignores a broken record', () => {
    window.localStorage.setItem('drafta:view:v1:alice', '{"groupId":3}');
    expect(readViewState('alice')).toBeNull();
    window.localStorage.setItem('drafta:view:v1:alice', 'not json');
    expect(readViewState('alice')).toBeNull();
  });

  it('restores what still exists and falls back for the rest', () => {
    expect(restoreView(view(), state)).toEqual(view());
    // A deleted memo leaves the tray, without the editor pane.
    expect(restoreView(view({ noteId: 'gone', tabIds: ['gone', 'a'] }), state)).toEqual({ groupId: 'work', noteId: null, tabIds: ['a'], pane: 'notes' });
    // A memo in a deleted tray and a deleted tray fall back to the defaults.
    expect(restoreView(view({ groupId: 'old', noteId: 'orphan' }), state)).toBeNull();
    expect(restoreView(view({ groupId: 'restore', noteId: null, tabIds: [], pane: 'notes' }), state)?.groupId).toBe('restore');
    expect(restoreView(view({ groupId: ALL_MEMOS }), state)).toEqual({ groupId: ALL_MEMOS, noteId: 'b', tabIds: ['a', 'b'], pane: 'editor' });
    expect(restoreView(null, state)).toBeNull();
  });
});
