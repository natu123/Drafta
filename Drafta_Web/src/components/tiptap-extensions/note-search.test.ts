import { describe, it, expect } from 'vitest';
import { documentSchema } from './document-schema';
import { findNoteMatches } from './note-search';

describe('literal note search', () => {
  const doc = documentSchema.nodeFromJSON({ type: 'doc', content: [
    { type: 'title', content: [{ type: 'text', text: 'Alpha' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'al' }, { type: 'text', text: 'pha', marks: [{ type: 'bold' }] }, { type: 'text', text: ' 日本語 a.b [x]' }] },
    { type: 'codeBlock', content: [{ type: 'text', text: 'alpha' }] },
  ] });
  it('finds across marks, title and code without changing the document', () => {
    const before = doc.toJSON();
    const matches = findNoteMatches(doc, 'alpha');
    expect(matches).toHaveLength(3);
    for (const match of matches) expect(doc.textBetween(match.from, match.to).toLowerCase()).toBe('alpha');
    expect(doc.toJSON()).toEqual(before);
  });
  it('supports Unicode and treats regex characters literally', () => {
    expect(findNoteMatches(doc, '日本語')).toHaveLength(1);
    expect(findNoteMatches(doc, 'a.b')).toHaveLength(1);
    expect(findNoteMatches(doc, '[x]')).toHaveLength(1);
    expect(findNoteMatches(doc, '')).toEqual([]);
    expect(findNoteMatches(doc, 'missing')).toEqual([]);
  });
});
