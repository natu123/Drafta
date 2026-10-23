/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGS } from '@/app/languages';
import { notes, groups } from './data';
import { localizeSampleNote } from './sample-notes';
import { createWorkspaceBackup, parseCachedWorkspaceBackup, parseTrustedWorkspaceBackup, snapshotWorkspace, type BackupSettings } from './workspace-backup';
import { noteWithContent, sameNoteBody, workspaceToState } from './workspace-state';
import { isLazyNote, sourceOf } from './note-source';

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

describe('memos that stay unconverted until opened (specs/17)', () => {
  // Rich sample bodies (lists, tasks, tables, code) as ordinary memos, so they are not localized samples.
  const richNotes = (language: (typeof LANGS)[number]) => notes.map(note => ({ ...localizeSampleNote(note, language, 'Ctrl'), sampleKey: undefined }));

  it.each(LANGS)('saves an untouched lazy workspace exactly as stored, with the start of the same preview text, in %s', language => {
    const backup = createWorkspaceBackup({ notes: richNotes(language), groups, settings }, document, date);
    const eager = workspaceToState(backup, document);
    const lazy = workspaceToState(backup, document, { lazyBodies: true });
    expect(lazy.notes.every(isLazyNote)).toBe(true);
    expect(createWorkspaceBackup(lazy, document, date)).toEqual(backup);
    // A card shows the first 300 characters; search reads the rest (global-search.ts).
    expect(lazy.notes.map(note => note.plainTextContent)).toEqual(eager.notes.map(note => Array.from(note.plainTextContent ?? '').slice(0, 300).join('')));
    expect(lazy.notes.map(note => noteWithContent(note, document).content)).toEqual(eager.notes.map(note => note.content));
  });

  it('changes only the edited memo and keeps other changes to unopened memos', () => {
    const backup = createWorkspaceBackup({ notes: richNotes('ja'), groups, settings }, document, date);
    const lazy = workspaceToState(backup, document, { lazyBodies: true });
    const opened = noteWithContent(lazy.notes[0], document);
    const edited = { ...opened, content: `${opened.content}<p>added</p>` };
    const pinned = { ...lazy.notes[1], isPinned: !lazy.notes[1].isPinned };
    const saved = snapshotWorkspace({ ...lazy, notes: [edited, pinned, ...lazy.notes.slice(2)] }, document, date);
    expect(JSON.stringify(saved.notes[0].document)).toContain('added');
    expect(saved.notes[1]).toEqual({ ...backup.notes[1], isPinned: pinned.isPinned });
    // Unopened bodies are the stored documents themselves, not converted copies.
    expect(saved.notes.slice(1).every((note, index) => note.document === sourceOf(lazy.notes[index + 1])?.note.document)).toBe(true);
  });

  it('never saves a memo whose body is not loaded or whose title changed without it', () => {
    const backup = createWorkspaceBackup({ notes: richNotes('en'), groups, settings }, document, date);
    const lazy = workspaceToState(backup, document, { lazyBodies: true });
    const lost = { ...lazy.notes[0], source: undefined };
    expect(() => snapshotWorkspace({ ...lazy, notes: [lost, ...lazy.notes.slice(1)] }, document, date)).toThrow('Memo body is not loaded');
    const renamed = { ...lazy.notes[0], title: 'Renamed' };
    expect(() => snapshotWorkspace({ ...lazy, notes: [renamed, ...lazy.notes.slice(1)] }, document, date)).toThrow('Memo title changed without its body');
  });

  it('compares bodies across states without opening them', () => {
    const backup = createWorkspaceBackup({ notes: richNotes('en'), groups, settings }, document, date);
    const first = workspaceToState(backup, document, { lazyBodies: true });
    const again = workspaceToState(backup, document, { lazyBodies: true });
    expect(sameNoteBody(first.notes[0], again.notes[0], document)).toBe(true);
    expect(sameNoteBody(first.notes[0], again.notes[1], document)).toBe(false);
    // An edited memo against the same memo arriving unopened: equal unless the body really changed.
    const opened = noteWithContent(first.notes[0], document);
    expect(sameNoteBody(opened, again.notes[0], document)).toBe(true);
    expect(sameNoteBody(again.notes[0], { ...opened, content: `${opened.content}<p>more</p>` }, document)).toBe(false);
    // The save check compares memo JSON; another stored body must not look like the same memo.
    expect(JSON.stringify(first.notes[0])).not.toBe(JSON.stringify(again.notes[0]));
  });
});

describe('the device copy: bodies checked after the list shows (specs/16)', () => {
  const stored = () => createWorkspaceBackup({ notes: notes.map(note => ({ ...localizeSampleNote(note, 'en', 'Ctrl'), sampleKey: undefined })), groups, settings }, document, date);
  // A body the app would never write: an unknown node after the text.
  const withBadBody = () => {
    const value = JSON.parse(JSON.stringify(stored()));
    value.notes[1].document.document.content.push({ type: 'script' });
    return JSON.stringify(value);
  };
  afterEach(() => { vi.useRealTimers(); });

  it('shows the list before walking the bodies, and walks each one before it is opened or saved', () => {
    expect(() => parseTrustedWorkspaceBackup(withBadBody())).toThrow('Unknown node type');
    const cached = parseCachedWorkspaceBackup(withBadBody());
    const state = workspaceToState(cached, document, { lazyBodies: true });
    expect(state.notes.map(note => note.title)).toEqual(workspaceToState(stored(), document, { lazyBodies: true }).notes.map(note => note.title));
    expect(() => noteWithContent(state.notes[1], document)).toThrow('Unknown node type');
    expect(() => snapshotWorkspace(state, document, date)).toThrow('Unknown node type');
    expect(noteWithContent(state.notes[0], document).content).toBe(noteWithContent(workspaceToState(stored(), document, { lazyBodies: true }).notes[0], document).content);
  });

  it('reports a bad body found after start-up, and saves an untouched copy exactly as stored', () => {
    vi.useFakeTimers();
    const invalid = vi.fn();
    workspaceToState(parseCachedWorkspaceBackup(withBadBody()), document, { lazyBodies: true, onInvalidBody: invalid });
    vi.advanceTimersByTime(1000);
    expect(invalid).toHaveBeenCalledTimes(1);
    expect(String(invalid.mock.calls[0][0])).toContain('Unknown node type');
    const good = vi.fn();
    const backup = stored();
    const state = workspaceToState(parseCachedWorkspaceBackup(JSON.stringify(backup)), document, { lazyBodies: true, onInvalidBody: good });
    vi.advanceTimersByTime(1000);
    expect(good).not.toHaveBeenCalled();
    expect(createWorkspaceBackup(state, document, date)).toEqual(backup);
  });

  it('still refuses a copy whose memos or trays are broken', () => {
    const value = JSON.parse(JSON.stringify(stored()));
    value.notes[0].document = 'not a document';
    expect(() => parseCachedWorkspaceBackup(JSON.stringify(value))).toThrow();
    const orphan = JSON.parse(JSON.stringify(stored()));
    orphan.notes[0].group = 'missing';
    expect(() => parseCachedWorkspaceBackup(JSON.stringify(orphan))).toThrow();
  });
});
