/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TitleDocument } from './title-document';
import { Title } from './title-node';
import { CustomListItem } from './custom-list-item';
import { RichMarkdownInputRules } from './rich-markdown-input-rules';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';

let editor: Editor;
afterEach(() => editor?.destroy());
function createEditor(enabled = () => true, body = '<p></p>') {
  editor = new Editor({
    extensions: [TitleDocument, Title, StarterKit.configure({ document: false, listItem: false }), CustomListItem, TaskList, TaskItem, TextStyle, Color, Table, TableRow, TableHeader, TableCell, RichMarkdownInputRules.configure({ isEnabled: enabled })],
    content: `<h1>Title</h1>${body}`,
    enableInputRules: ['richMarkdownInputRules'],
    enablePasteRules: false,
  });
  editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize + 1);
  return editor;
}
function type(text: string) {
  for (const char of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp('handleTextInput', handler => handler(editor.view, from, to, char, () => editor.state.tr.insertText(char, from, to)));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(char, from, to));
  }
}

describe('Rich-mode Markdown prefixes', () => {
  it.each(['>\u00a0', '*\u00a0', '-\u00a0', '+\u00a0'])('accepts browser-normalized spacing in %s', prefix => {
    createEditor();type(prefix);
    expect(editor.state.doc.child(1).type.name).toBe(prefix[0] === '>' ? 'blockquote' : 'bulletList');
  });
  it.each([['> ', 'blockquote'], ['* ', 'bulletList'], ['- ', 'bulletList'], ['+ ', 'bulletList']])('converts %s into %s and supports undo', (prefix, nodeType) => {
    createEditor();type(prefix);
    expect(editor.state.doc.child(1).type.name).toBe(nodeType);
    expect(editor.state.doc.firstChild!.type.name).toBe('title');
    expect(editor.state.doc.firstChild!.textContent).toBe('Title');
    const handled = editor.view.someProp('handleKeyDown', handler => handler(editor.view, new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', keyCode: 8 })));
    expect(handled).toBe(true);
    expect(editor.state.doc.child(1).type.name).toBe('paragraph');
    expect(editor.state.doc.child(1).textContent).toBe(prefix);
  });

  it('keeps prefixes literal in Plain mode and responds to mode changes', () => {
    let enabled = false;
    createEditor(() => enabled);type('> ');
    expect(editor.state.doc.child(1).type.name).toBe('paragraph');
    expect(editor.state.doc.child(1).textContent).toBe('> ');
    editor.commands.setContent('<h1>Title</h1><p></p>');
    editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize + 1);
    enabled = true;type('* ');
    expect(editor.state.doc.child(1).type.name).toBe('bulletList');
  });

  it('does not convert the title, middle of a line, or code blocks', () => {
    createEditor();editor.commands.setTextSelection(1);type('> ');
    expect(editor.state.doc.firstChild!.textContent).toBe('> Title');
    editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize + 1);type('Text > ');
    expect(editor.state.doc.child(1).type.name).toBe('paragraph');
    editor.commands.setContent('<h1>Title</h1><pre><code></code></pre>');
    editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize + 1);type('- ');
    expect(editor.state.doc.child(1).type.name).toBe('codeBlock');
    expect(editor.state.doc.child(1).textContent).toBe('- ');
  });

  it.each([['# ', 'heading'], ['## ', 'heading'], ['### ', 'heading'], ['1. ', 'orderedList'], ['[ ] ', 'taskList'], ['[x] ', 'taskList'], ['```js ', 'codeBlock'], ['~~~ ', 'codeBlock'], ['--- ', 'horizontalRule']])('converts block pattern %s', (text, node) => {
    createEditor();type(text);expect(editor.state.doc.child(1).type.name).toBe(node);
  });

  it.each([['**bold**', 'bold', 'bold'], ['__bold__', 'bold', 'bold'], ['*italic*', 'italic', 'italic'], ['_italic_', 'italic', 'italic'], ['~~strike~~', 'strike', 'strike'], ['`code`', 'code', 'code'], ['{color:#64A364}green{/color}', 'textStyle', 'green']])('converts inline pattern %s', (text, mark, expected) => {
    createEditor();type(text);
    const node = editor.state.doc.child(1);
    expect(node.textContent).toBe(expected);
    expect(node.firstChild!.marks.some(value => value.type.name === mark)).toBe(true);
  });

  it('converts a code fence and a Markdown table on Enter', () => {
    createEditor();type('```');
    const enter = () => editor.view.someProp('handleKeyDown', handler => handler(editor.view, new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 })));
    expect(enter()).toBe(true);expect(editor.state.doc.child(1).type.name).toBe('codeBlock');
    editor.commands.setContent('<h1>Title</h1><p>| Name | Status |</p><p>| --- | --- |</p>');
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    expect(enter()).toBe(true);expect(editor.state.doc.child(1).type.name).toBe('table');
    expect(editor.state.doc.child(1).firstChild!.childCount).toBe(2);
    expect(editor.state.doc.child(1).firstChild!.textContent).toBe('NameStatus');
  });
});
