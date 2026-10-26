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
const marks = () => {
  const list = (editor.view.dom as HTMLElement).querySelector('h1')!.classList;
  return { editing: list.contains('is-editing'), body: list.contains('is-body') };
};

describe('title row', () => {
  it('marks nothing until the editor has the focus, then where the caret is', () => {
    editor = new Editor({ extensions: [TitleDocument, Title, StarterKit.configure({ document: false }), TitleRow], content: '<h1>A long title</h1><p>Body</p>' });
    at(3);
    expect(marks()).toEqual({ editing: false, body: false });
    focused(true);
    expect(marks()).toEqual({ editing: true, body: false });
    at(16);
    expect(marks()).toEqual({ editing: false, body: true });
    focused(false);
    expect(marks()).toEqual({ editing: false, body: false });
  });
});
