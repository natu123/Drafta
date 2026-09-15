/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { notes } from './data';
import { sampleCopy } from './sample-copy';
import { localizeSampleNote } from './sample-notes';

describe('localized protected samples', () => {
  for (const lang of LANGS) {
    it(`provides complete copy and preserves rich structure for ${lang}`, () => {
      for (const seed of notes.filter(note => note.sampleKey)) {
        const key = seed.sampleKey!;
        expect(sampleCopy[lang][key]).toHaveLength(sampleCopy.en[key].length);
        expect(sampleCopy[lang][key].every(text => text.trim().length > 0)).toBe(true);
        const result = localizeSampleNote(seed, lang, 'Ctrl');
        expect(result.title).toBe(sampleCopy[lang][key][0]);
        expect(result.id).toBe(seed.id);
        expect(result.icon).toBe(seed.icon);
        expect(result.createdAt).toBe(seed.createdAt);
        expect(result.updatedAt).toBe(seed.updatedAt);
        expect(result.isProtected).toBe(true);
        expect(result.content.match(/<[^>]+>/g)).toEqual(seed.content.match(/<[^>]+>/g));
        expect(result.content).not.toContain('{{Mod}}');
        expect(result.plainTextContent?.startsWith(sampleCopy[lang][key][1])).toBe(true);
        expect(result.plainTextContent).not.toMatch(/<\/?(?:p|h3|table)>/);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = result.content;
        expect(wrapper.querySelectorAll('table').length).toBeGreaterThan(0);
        expect(wrapper.querySelectorAll('li[data-type="taskItem"]').length).toBeGreaterThan(0);
        if (key === 'reference') expect(result.content).toContain('Ctrl+Shift+X');
      }
    });
  }

  it('covers all non-code English phrases in the template', () => {
    for (const note of notes.filter(note => note.sampleKey)) {
      const root = document.createElement('div');
      root.innerHTML = note.content;
      root.querySelectorAll('code').forEach(node => node.remove());
      const phrases = sampleCopy.en[note.sampleKey!];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent!.trim();
        if (/[a-z]/i.test(text) && text !== 'Markdown') expect(phrases).toContain(text);
      }
    }
  });

  it('keeps ordinary and user-edited unprotected notes untouched', () => {
    const ordinary = { ...notes[0], id: 'user-note', sampleKey: undefined, title: 'My own title', content: '{{Mod}} <p>My text</p>' };
    expect(localizeSampleNote(ordinary, 'ja', 'Cmd')).toBe(ordinary);
    const editable = { ...notes[0], isProtected: false };
    expect(localizeSampleNote(editable, 'ja', 'Cmd')).toBe(editable);
    for (const note of notes.slice(2)) expect(localizeSampleNote(note, 'ja', 'Ctrl')).toBe(note);
  });

  it('supports platform shortcuts without mutating seeds', () => {
    const seed = notes[1];
    const snapshot = JSON.stringify(seed);
    expect(localizeSampleNote(seed, 'ja', 'Cmd').content).toContain('Cmd+B');
    expect(localizeSampleNote(seed, 'ja', 'Ctrl').content).toContain('Ctrl+B');
    expect(JSON.stringify(seed)).toBe(snapshot);
  });

  it('always renders from the source template across repeated language switches', () => {
    let sample = notes[0];
    for (const lang of LANGS) {
      sample = localizeSampleNote(sample, lang, 'Ctrl');
      expect(sample.content).toContain(sampleCopy[lang].welcome[1]);
      expect(sample.title).toBe(sampleCopy[lang].welcome[0]);
    }
  });
});
