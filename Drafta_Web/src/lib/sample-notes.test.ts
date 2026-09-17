/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { notes } from './data';
import { sampleCopy } from './sample-copy';
import { localizeSampleNote, getSamplePhrases, applySampleEdit } from './sample-notes';

describe('localized protected samples', () => {
  it('uses the lighter English closing line while preserving the Japanese copy', () => {
    const seed = notes.find(note => note.sampleKey === 'welcome')!;
    for (const [lang, text] of [['en', 'Move forward, feel lighter.'], ['ja', 'ここから、もっと軽やかに！']] as const) {
      const result = localizeSampleNote(seed, lang, 'Ctrl');
      expect(result.content).toContain(`<blockquote><p>${text}</p></blockquote>`);
      expect(result.plainTextContent).toContain(text);
      expect(result.content).not.toContain("You're accelerating now!");
    }
  });

  for (const lang of LANGS) {
    it(`provides complete copy and preserves rich structure for ${lang}`, () => {
      for (const seed of notes.slice(0, 2)) {
        const key = seed.sampleKey;
        if (key !== 'welcome' && key !== 'reference') throw new Error('Unexpected protected sample');
        expect(sampleCopy[lang][key]).toHaveLength(sampleCopy.en[key].length);
        expect(sampleCopy[lang][key].every(text => text.trim().length > 0)).toBe(true);
        const result = localizeSampleNote(seed, lang, 'Ctrl');
        expect(result.title).toBe(sampleCopy[lang][key][0]);
        expect(result.id).toBe(seed.id);
        expect(result.icon).toBe(seed.icon);
        expect(result.createdAt).toBe(seed.createdAt);
        expect(result.updatedAt).toBe(seed.updatedAt);
        expect(result.isProtected).toBe(false);
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
      const phrases = getSamplePhrases(note.sampleKey!, 'en');
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent!.trim();
        if (/[a-z]/i.test(text) && !['Markdown', 'Alex, Jamie, Sam, Taylor'].includes(text)) expect(phrases).toContain(text);
      }
    }
  });

  it('keeps ordinary and user-edited unprotected notes untouched', () => {
    const ordinary = { ...notes[0], id: 'user-note', sampleKey: undefined, title: 'My own title', content: '{{Mod}} <p>My text</p>' };
    expect(localizeSampleNote(ordinary, 'ja', 'Cmd')).toBe(ordinary);
    const editable = { ...notes[0], isProtected: false, sampleKey: undefined };
    expect(localizeSampleNote(editable, 'ja', 'Cmd')).toBe(editable);
    for (const note of notes.slice(2)) {
      const detached = { ...note, sampleKey: undefined };
      expect(localizeSampleNote(detached, 'ja', 'Ctrl')).toBe(detached);
    }
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

describe('editable examples', () => {
  for (const lang of LANGS) {
    it(`translates all seven examples without changing metadata or structure in ${lang}`, () => {
      for (const seed of notes.slice(2)) {
        const source = getSamplePhrases(seed.sampleKey!, 'en');
        const target = getSamplePhrases(seed.sampleKey!, lang);
        expect(target).toHaveLength(source.length);
        expect(target.every(text => text.trim().length > 0)).toBe(true);
        const result = localizeSampleNote(seed, lang, 'Ctrl');
        expect(result.title).toBe(target[source.indexOf(seed.title)]);
        expect(result.content.match(/<[^>]+>/g)).toEqual(seed.content.match(/<[^>]+>/g));
        expect(result.content.match(/<pre>[\s\S]*?<\/pre>/g)).toEqual(seed.content.match(/<pre>[\s\S]*?<\/pre>/g));
        for (const field of ['id', 'icon', 'group', 'isProtected', 'createdAt', 'updatedAt', 'parentId', 'stars'] as const) {
          expect(result[field]).toBe(seed[field]);
        }
        if (seed.sampleKey === 'groceries') {
          for (const cost of ['$15.00', '$8.50', '$12.00', '$35.50']) expect(result.content).toContain(cost);
        }
      }
    });
  }

  it('freezes the displayed translation on an edit and never retranslates it', () => {
    const seed = notes[2];
    const japanese = localizeSampleNote(seed, 'ja', 'Ctrl');
    const changed = applySampleEdit(seed, { title: 'My custom title' }, 'ja', 'Ctrl');
    expect(changed.sampleKey).toBeUndefined();
    expect(changed.content).toBe(japanese.content);
    expect(changed.title).toBe('My custom title');
    expect(localizeSampleNote(changed, 'ar', 'Ctrl')).toBe(changed);
    const bodyChanged = applySampleEdit(seed, { content: '<p>My content {{Mod}}</p>' }, 'ja', 'Ctrl');
    expect(localizeSampleNote(bodyChanged, 'fr', 'Ctrl').content).toBe('<p>My content {{Mod}}</p>');
    expect(bodyChanged.title).toBe(japanese.title);
  });

  it('retains user metadata and deletion state during translation', () => {
    const seed = { ...notes[5], isCompleted: true, isDeleted: true, icon: '⭐', group: 'work' };
    const result = localizeSampleNote(seed, 'ja', 'Ctrl');
    expect(result.isCompleted).toBe(true);
    expect(result.isDeleted).toBe(true);
    expect(result.icon).toBe('⭐');
    expect(result.group).toBe('work');
  });
});
