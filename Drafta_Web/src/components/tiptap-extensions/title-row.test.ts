/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextSelection } from '@tiptap/pm/state';
import { TitleDocument } from './title-document';
import { Title } from './title-node';
import { TitleRow, titleRowKey } from './title-row';

let editor: Editor;
afterEach(() => editor?.destroy());
const at = (pos: number) => editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)));
const focused = (value: boolean) => editor.view.dispatch(editor.state.tr.setMeta(titleRowKey, value));
const editing = () => (editor.view.dom as HTMLElement).querySelector('h1')!.classList.contains('is-editing');

describe('title row', () => {
  it('marks the title while the focused editor has the caret in it', () => {
    editor = new Editor({ extensions: [TitleDocument, Title, StarterKit.configure({ document: false }), TitleRow], content: '<h1>A long title</h1><p>Body</p>' });
    at(3);
    expect(editing()).toBe(false);
    focused(true);
    expect(editing()).toBe(true);
    at(16);
    expect(editing()).toBe(false);
    at(3); focused(false);
    expect(editing()).toBe(false);
  });
});
