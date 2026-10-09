/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TitleDocument } from './title-document';
import { Title } from './title-node';
import { TitlePlaceholder } from './title-placeholder';

let editor: Editor;
afterEach(() => editor?.destroy());
const create = (content: string) => {
  editor = new Editor({ extensions: [TitleDocument, Title, StarterKit.configure({ document: false }), TitlePlaceholder.configure({ placeholder: () => 'Untitled' })], content });
  return editor.view.dom as HTMLElement;
};

describe('title placeholder', () => {
  it('marks only an empty title with the placeholder text', () => {
    const dom = create('<h1></h1><p></p><p>Body</p>');
    expect(dom.querySelector('h1')!.classList.contains('is-empty')).toBe(true);
    expect(dom.querySelector('h1')!.getAttribute('data-placeholder')).toBe('Untitled');
    expect(dom.querySelectorAll('.is-empty')).toHaveLength(1);
  });
  it('removes the placeholder once the title has text and restores it when cleared', () => {
    const dom = create('<h1></h1><p></p>');
    editor.commands.insertContentAt(1, 'Title');
    expect(dom.querySelector('h1')!.classList.contains('is-empty')).toBe(false);
    editor.commands.deleteRange({ from: 1, to: 6 });
    expect(dom.querySelector('h1')!.getAttribute('data-placeholder')).toBe('Untitled');
  });
});
