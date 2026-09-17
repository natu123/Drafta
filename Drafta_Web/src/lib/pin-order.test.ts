import { describe, it, expect } from 'vitest';
import { pinnedNotes, regularNotes, reorderPinSection } from './pin-order';
import { notes } from './data';
import { applySampleEdit, localizeSampleNote } from './sample-notes';

describe('pin sections', () => {
  it('starts Welcome and Quick Reference pinned but editable', () => {
    for (const id of ['note-1', 'note-2']) {
      expect(notes.find(note => note.id === id)).toMatchObject({ isPinned: true, isProtected: false });
    }
  });
  const items = ['a', 'b', 'c', 'd'].map((id, i) => ({ ...notes[0], id, isPinned: i % 2 === 0 }));
  it('partitions without changing stored order', () => {
    expect(pinnedNotes(items).map(n => n.id)).toEqual(['a', 'c']);
    expect(regularNotes(items).map(n => n.id)).toEqual(['b', 'd']);
    expect(items.map(n => n.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('reorders only within a pin section', () => {
    expect(reorderPinSection(items, 'c', 'a').map(n => n.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(reorderPinSection(items, 'a', 'b')).toBe(items);
  });
  it('makes both former fixed samples editable and freezes translated edits', () => {
    for (const note of notes.slice(0, 2)) {
      expect(note.isProtected).toBe(false);
      const localized = localizeSampleNote(note, 'ja', 'Ctrl');
      const edited = applySampleEdit(note, { title: 'Custom title' }, 'ja', 'Ctrl');
      expect(edited.sampleKey).toBeUndefined();
      expect(edited.content).toBe(localized.content);
      expect(localizeSampleNote(edited, 'en', 'Ctrl')).toBe(edited);
    }
  });
});
