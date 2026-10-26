/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { TitleDocument } from './title-document';
import { Title } from './title-node';
import { TitleCaret } from './title-caret';
import { documentExtensions } from './document-schema';

let editor: Editor;
afterEach(() => editor?.destroy());
// Without the gap cursor, only this extension answers the arrows, so false means "left to the browser".
const create = (content: string) => {
  editor = new Editor({ extensions: [TitleDocument, Title, StarterKit.configure({ document: false, gapcursor: false }), Table, TableRow, TableCell, TableHeader, TitleCaret], content });
};
const press = (key: string, init: KeyboardEventInit = {}) =>
  Boolean(editor.view.someProp('handleKeyDown', handle => handle(editor.view, new KeyboardEvent('keydown', { key, ...init }))));
const at = (pos: number) => editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)));

describe('title caret', () => {
  it('keeps the right arrow at the end of the title', () => {
    create('<h1>Title</h1><p>Body</p>');
    at(6);
    expect(press('ArrowRight')).toBe(true);
    expect(press('ArrowRight', { ctrlKey: true })).toBe(true);
    expect(press('ArrowRight', { altKey: true })).toBe(true);
    expect(editor.state.selection.from).toBe(6);
    at(3);
    expect(press('ArrowRight')).toBe(false);
  });
  it('keeps the right arrow in an empty title', () => {
    create('<h1></h1><p>Body</p>');
    at(1);
    expect(press('ArrowRight')).toBe(true);
  });
  it('keeps the left arrow at the start of the body', () => {
    create('<h1>Title</h1><p>Body</p>');
    at(8);
    expect(press('ArrowLeft')).toBe(true);
    expect(press('ArrowLeft', { ctrlKey: true })).toBe(true);
    expect(press('ArrowLeft', { altKey: true })).toBe(true);
    expect(editor.state.selection.from).toBe(8);
    at(10);
    expect(press('ArrowLeft')).toBe(false);
  });
  it('keeps the down arrow on the last line of the title and the up arrow on the first line of the body', () => {
    create('<h1>Title</h1><p>Body</p><p>More</p>');
    const edge = vi.spyOn(editor.view, 'endOfTextblock');
    edge.mockReturnValue(true);
    at(3);
    expect(press('ArrowDown')).toBe(true);
    at(9);
    expect(press('ArrowUp')).toBe(true);
    at(15);
    expect(press('ArrowUp')).toBe(false);
    edge.mockReturnValue(false);
    at(3);
    expect(press('ArrowDown')).toBe(false);
    at(9);
    expect(press('ArrowUp')).toBe(false);
  });
  it('leaves Shift and a selection to the browser', () => {
    create('<h1>Title</h1><p>Body</p>');
    at(6);
    expect(press('ArrowRight', { shiftKey: true })).toBe(false);
    at(8);
    expect(press('ArrowLeft', { shiftKey: true })).toBe(false);
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 8, 10)));
    expect(press('ArrowLeft')).toBe(false);
  });
  it('treats the first line of a list as the start of the body', () => {
    create('<h1>T</h1><ul><li><p>Item</p></li></ul>');
    at(6);
    expect(press('ArrowLeft')).toBe(true);
  });
  it('stops at a rule right after the title and lets the line after it reach the rule', () => {
    create('<h1>T</h1><hr><p>After</p>');
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)));
    expect(press('ArrowLeft')).toBe(true);
    at(5);
    expect(press('ArrowLeft')).toBe(false);
  });
  it('keeps Enter in the title and Delete at its end from touching the body', () => {
    create('<h1>Title</h1><p>Body</p>');
    const before = editor.getHTML();
    at(3);
    expect(press('Enter')).toBe(true);
    at(6);
    expect(press('Enter')).toBe(true);
    expect(press('Delete')).toBe(true);
    expect(editor.getHTML()).toBe(before);
    expect(editor.state.selection.from).toBe(6);
  });
  it('keeps Backspace at the start of the body from joining the title', () => {
    create('<h1>Title</h1><p>Body</p>');
    const before = editor.getHTML();
    at(8);
    expect(press('Backspace')).toBe(true);
    expect(editor.getHTML()).toBe(before);
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
  });
  it('removes an empty first line with Backspace and stays in the body', () => {
    create('<h1>Title</h1><p></p><p>Next</p>');
    at(8);
    expect(press('Backspace')).toBe(true);
    expect(editor.getHTML()).toBe('<h1>Title</h1><p>Next</p>');
    expect(editor.state.selection.$from.parent.textContent).toBe('Next');
  });
  it('leaves Backspace in a list at the start of the body to the list', () => {
    create('<h1>T</h1><ul><li><p>Item</p></li></ul>');
    at(6);
    press('Backspace');
    expect(editor.state.doc.firstChild!.textContent).toBe('T');
    expect(editor.state.selection.$from.parent.type.name).not.toBe('title');
  });
  it('runs before the gap cursor of the real editor when a table comes first', () => {
    editor = new Editor({ extensions: [...documentExtensions, TitleCaret], content: '<h1>T</h1><table><tr><td><p>Cell</p></td></tr></table><p>After</p>' });
    at(2);
    expect(press('ArrowRight')).toBe(true);
    expect(editor.state.selection.from).toBe(2);
    const cell = editor.state.doc.firstChild!.nodeSize + 4;
    at(cell);
    expect(editor.state.doc.textBetween(cell, cell + 4)).toBe('Cell');
    expect(press('ArrowLeft')).toBe(true);
  });
});
