/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { notes, groups } from './data';
import { localizeSampleNote } from './sample-notes';
import { createWorkspaceBackup, type BackupSettings } from './workspace-backup';
import { workspaceToState } from './workspace-state';

const settings: BackupSettings = { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' };
const date = '2026-09-28T00:00:00.000Z';

describe('persisted workspace to application state', () => {
  it.each(LANGS)('preserves the complete document and metadata in %s', language => {
    const source = { notes: notes.map(note => localizeSampleNote(note, language, 'Ctrl')), groups, settings: { ...settings, language } };
    const backup = createWorkspaceBackup(source, document, date);
    const state = workspaceToState(backup, document);
    expect(createWorkspaceBackup(state, document, date)).toEqual(backup);
    expect(state.notes.map(note => note.id)).toEqual(source.notes.map(note => note.id));
    expect(state.groups).toEqual(groups);
    expect(state.settings).toEqual(source.settings);
    state.groups[0].name = 'Detached';
    expect(backup.groups[0].name).not.toBe('Detached');
  });

  it('preserves empty workspaces without creating sample data', () => {
    const source = { notes: [], groups: [], settings };
    expect(workspaceToState(createWorkspaceBackup(source, document, date), document)).toEqual(source);
  });

  it('preserves title colors and derives a plain preview without title or markup', () => {
    const source = { groups, settings, notes: [{ ...notes[5], sampleKey: undefined, title: '{color:#64A364}Green{/color}', content: '<p>First</p><p>Second <strong>bold</strong></p>' }] };
    const backup = createWorkspaceBackup(source, document, date);
    const state = workspaceToState(backup, document);
    expect(state.notes[0].title.toLowerCase()).toBe(source.notes[0].title.toLowerCase());
    expect(state.notes[0].plainTextContent).toBe('First Second bold');
    expect(createWorkspaceBackup(state, document, date)).toEqual(backup);
  });

  it('rejects invalid data and unsupported automatic ordering before restoration', () => {
    const backup = createWorkspaceBackup({ notes, groups, settings }, document, date);
    backup.settings.noteSort = 'newest';
    expect(() => workspaceToState(backup, document)).toThrow('Only manual order');
    backup.settings.noteSort = 'manual';
    backup.notes[0].group = 'missing';
    expect(() => workspaceToState(backup, document)).toThrow();
  });
});
