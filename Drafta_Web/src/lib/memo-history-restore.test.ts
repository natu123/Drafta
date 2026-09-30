/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { notes as samples, groups } from './data';
import { localizeSampleNote } from './sample-notes';
import { createWorkspaceBackup } from './workspace-backup';
import { freezeHistorySample, historyNoteToState, restoreHistoryCopy } from './memo-history-restore';
import type { MemoHistoryVersion } from './memo-history';

const now = '2026-09-30T00:00:00.000Z';
function version(): MemoHistoryVersion {
  const source = { ...samples[5], sampleKey: undefined, parentId: undefined, title: 'Earlier title', content: '<p>Earlier <strong>words</strong></p>', group: groups[0].id };
  const backup = createWorkspaceBackup({ groups, notes: [source], settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' } }, document, now);
  return { id: 'v-1', capturedAt: now, note: backup.notes[0] };
}
const options = () => { let id = 0; return { dom: document, preferredGroupId: groups[0].id,
  newId: () => `restored-${++id}`, now, suffix: '復元', unnamed: '無題のメモ', recoveredTrayName: '復元したメモ',
}; };

describe('restoring a history version as a separate memo', () => {
  it('retains title and Rich formatting without overwriting the original', () => {
    const historical = version();
    const current = historyNoteToState(historical, document); current.title = 'Current title'; current.content = '<p>Current words</p>';
    const before = JSON.stringify([historical, current, groups]);
    const restored = restoreHistoryCopy(historical, groups, [current], options());
    expect(restored.note.id).not.toBe(current.id);
    expect(restored.note.title).toBe('Earlier title (復元)');
    expect(restored.note.content).toContain('<strong>words</strong>');
    expect(restored.note.group).toBe(current.group);
    expect(restored.newGroup).toBeNull();
    expect(restored.note.isDeleted).toBe(false); expect(restored.note.sampleKey).toBeUndefined();
    expect(JSON.stringify([historical, current, groups])).toBe(before);
  });
  it('uses an available tray or creates a recovery tray when none exists', () => {
    const restored = restoreHistoryCopy(version(), [], [], options());
    expect(restored.newGroup?.name).toBe('復元したメモ');
    expect(restored.note.group).toBe(restored.newGroup?.id);
    expect(restored.note.id).not.toBe(restored.newGroup?.id);
    const nextGroups = [{ ...groups[0], isDeleted: true }, groups[1]];
    expect(restoreHistoryCopy(version(), nextGroups, [], options()).note.group).toBe(groups[1].id);
  });
  it('drops missing parent links and refuses duplicate IDs', () => {
    const historical = version(); historical.note.parentId = 'missing-parent';
    expect(restoreHistoryCopy(historical, groups, [], options()).note.parentId).toBeUndefined();
    expect(() => restoreHistoryCopy(historical, groups, [], { ...options(), newId: () => groups[0].id })).toThrow('Duplicate');
  });
  it.each(LANGS)('freezes the displayed sample in %s so history never follows future translations', language => {
    const backup = createWorkspaceBackup({ groups, notes: samples, settings: { language, theme: 'system', listStyle: 'top', noteSort: 'manual' } }, document, now);
    const reference = backup.notes.find(note => note.id === 'note-2')!;
    const frozen = freezeHistorySample(reference, document, language, 'Ctrl');
    expect(frozen.sampleKey).toBeUndefined();
    const preview = historyNoteToState({ id: 'sample-history', capturedAt: now, note: frozen }, document);
    expect(preview.title).toBe(localizeSampleNote(samples.find(note => note.id === 'note-2')!, language, 'Ctrl').title);
    expect(preview.content).not.toContain('{{Mod}}');
    expect(localizeSampleNote(preview, language === 'ja' ? 'en' : 'ja', 'Cmd')).toBe(preview);
  });
});
