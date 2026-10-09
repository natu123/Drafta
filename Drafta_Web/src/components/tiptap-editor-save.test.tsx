/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor as TiptapInstance } from '@tiptap/core';
import TiptapEditor, { EDITOR_SAVE_DELAY_MS } from './tiptap-editor';
import { flushPendingEdits } from '@/lib/pending-edits';
import { translations } from '@/app/translations';
import type { Note } from '@/lib/types';

vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ t: translations.en, lang: 'en' }) }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

const memo = (id: string, content: string): Note => ({ id, title: `Memo ${id}`, content, plainTextContent: '', icon: '📝', group: 'tray', stars: 0, createdAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z' });

describe('editor text reaches app state without being lost', () => {
  let container: HTMLDivElement;
  let root: Root;
  const update = vi.fn();
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
    update.mockClear();
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  const mount = async (note: Note) => {
    await act(async () => { root.render(<TiptapEditor key={note.id} note={note} onNoteUpdate={update} onIconChange={vi.fn()} />); });
    await vi.waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull());
    return (container.querySelector('.ProseMirror') as HTMLElement & { editor: TiptapInstance }).editor;
  };
  const type = (editor: TiptapInstance, text: string) => act(() => { editor.commands.insertContentAt(editor.state.doc.content.size - 1, text); });
  const lastContent = () => update.mock.calls.at(-1)?.[0].content as string | undefined;

  it('writes once after typing pauses instead of on every keystroke', async () => {
    const editor = await mount(memo('a', '<p>Start</p>'));
    type(editor, ' one'); type(editor, ' two');
    expect(update).not.toHaveBeenCalled();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, EDITOR_SAVE_DELAY_MS + 100)); });
    expect(update).toHaveBeenCalledOnce();
    expect(lastContent()).toContain('Start one two');
    expect(update.mock.calls[0][1]).toBe('a');
  });

  it('writes pending text immediately when the app flushes before saving or syncing', async () => {
    const editor = await mount(memo('a', '<p>Start</p>'));
    type(editor, ' urgent');
    let wrote = false;
    act(() => { wrote = flushPendingEdits(); });
    expect(wrote).toBe(true);
    expect(lastContent()).toContain('Start urgent');
    expect(flushPendingEdits()).toBe(false);
  });

  it('writes pending text to the memo it belonged to when switching memos', async () => {
    const editor = await mount(memo('a', '<p>First</p>'));
    type(editor, ' unsaved');
    await mount(memo('b', '<p>Second</p>'));
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][1]).toBe('a');
    expect(lastContent()).toContain('First unsaved');
  });

  it('writes pending text when the editor closes or loses focus', async () => {
    let editor = await mount(memo('a', '<p>Closing</p>'));
    type(editor, ' tab');
    act(() => root.unmount());
    expect(lastContent()).toContain('Closing tab');
    root = createRoot(container);
    editor = await mount(memo('c', '<p>Blur</p>'));
    type(editor, ' away');
    act(() => { editor.view.dom.dispatchEvent(new FocusEvent('blur')); editor.emit('blur', { editor, event: new FocusEvent('blur'), transaction: editor.state.tr }); });
    expect(lastContent()).toContain('Blur away');
  });
});
