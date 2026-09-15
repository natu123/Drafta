/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { notes } from './data';
import { LANGS } from '@/app/languages';
import { localizeSampleNote } from './sample-notes';
import { editorHtmlToDocument, editorDocumentToHtml, type SerializedEditorDocument } from './document-codec';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

describe('versioned editor document codec', () => {
  it.each(LANGS)('round-trips all sample documents in %s', lang => {
    for (const seed of notes) {
      const note = localizeSampleNote(seed, lang, 'Ctrl');
      const value = editorHtmlToDocument(`<h1>${escape(note.title)}</h1>${note.content}`, document);
      expect(value.format).toBe('drafta-document');
      expect(value.schemaVersion).toBe(1);
      expect(value.document.content?.[0].type).toBe('title');
      const output = editorDocumentToHtml(value, document);
      expect(editorHtmlToDocument(output, document)).toEqual(value);
      const dom = document.createElement('template');dom.innerHTML = output;
      expect(dom.content.querySelector('h1')?.textContent).toBe(note.title);
    }
  });

  it('preserves empty titles, body headings, color, marks, task state, code and table widths', () => {
    const input = '<h1></h1><h1>Body heading</h1><p><strong>Bold</strong><em>Italic</em><s>Strike</s><code>inline</code><span style="color:#64A364">Green</span></p>'
      + '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Done</p></li></ul>'
      + '<ol start="4"><li value="4"><p>Fourth</p></li></ol>'
      + '<pre><code class="language-typescript">const x = 1;\n  console.log(x);</code></pre>'
      + '<table><tbody><tr><th colspan="2" colwidth="120,160"><p>Header</p></th></tr><tr><td><p>A</p></td><td><p>B</p></td></tr></tbody></table>';
    const value = editorHtmlToDocument(input, document);
    const output = editorDocumentToHtml(value, document);
    const root = document.createElement('template');root.innerHTML = output;
    expect(root.content.querySelector('h1')?.textContent).toBe('');
    expect(root.content.querySelectorAll('h1')).toHaveLength(2);
    expect(root.content.querySelector('li[data-checked="true"]')).not.toBeNull();
    expect(root.content.querySelector('ol')?.getAttribute('start')).toBe('4');
    expect(root.content.querySelector('th')?.getAttribute('colwidth')).toBe('120,160');
    expect(root.content.querySelector('pre code')?.textContent).toContain('\n  console.log(x);');
    expect(root.content.querySelectorAll('strong, em, s, p > code, span[style]')).toHaveLength(5);
    expect(editorHtmlToDocument(output, document)).toEqual(value);
  });

  it('rejects unknown versions and structurally invalid documents', () => {
    const valid = editorHtmlToDocument('<h1>Title</h1><p>Body</p>', document);
    expect(() => editorDocumentToHtml({ ...valid, schemaVersion: 2 } as unknown as SerializedEditorDocument, document)).toThrow('Unsupported');
    expect(() => editorDocumentToHtml({ ...valid, document: { type: 'paragraph' } }, document)).toThrow('complete');
    expect(() => editorDocumentToHtml({ ...valid, document: { type: 'doc', content: [{ type: 'paragraph' }] } }, document)).toThrow();
    expect(() => editorDocumentToHtml({ ...valid, document: { type: 'unknown' } }, document)).toThrow();
  });
});
