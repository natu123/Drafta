import { describe, expect, it } from 'vitest';
import { requiresImmediateSave } from './workspace-change';
import type { WorkspaceBackup } from './workspace-backup';
const fresh = (): WorkspaceBackup => ({
  format: 'drafta-workspace', version: 1, exportedAt: '2026-09-28T00:00:00.000Z',
  groups: [{ id: 'tray', name: '', type: 'group' }],
  settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' },
  notes: [{ id: 'memo', group: 'tray', stars: 0, createdAt: '2026-09-28T00:00:00.000Z', updatedAt: '2026-09-28T00:00:00.000Z', document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'title' }, { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] }] } } }],
});
describe('autosave timing', () => {
  it('treats a shared memo as unchanged and still compares replaced memos', () => {
    const before = fresh();
    expect(requiresImmediateSave(before, { ...before, notes: [...before.notes] })).toBe(false);
    const moved = fresh(); moved.notes[0].stars = 2;
    expect(requiresImmediateSave(before, moved)).toBe(true);
  });
  it('debounces ordinary text and timestamp edits', () => {
    const before = fresh(), after = fresh();
    after.notes[0].document.document.content![1].content![0].text = 'After';
    after.notes[0].updatedAt = '2026-09-28T01:00:00.000Z';
    expect(requiresImmediateSave(before, after)).toBe(false);
  });
  it('saves structural and settings changes immediately', () => {
    const before = fresh();
    for (const change of [
      (value: WorkspaceBackup) => { value.notes = []; },
      (value: WorkspaceBackup) => { value.notes[0].isDeleted = true; },
      (value: WorkspaceBackup) => { value.groups[0].isPinned = true; },
      (value: WorkspaceBackup) => { value.settings.theme = 'dark'; },
      (value: WorkspaceBackup) => { value.notes[0].document.document.content![1].type = 'heading'; },
    ]) { const after = fresh(); change(after); expect(requiresImmediateSave(before, after)).toBe(true); }
    expect(requiresImmediateSave(null, before)).toBe(true);
  });
});
