/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { notes, groups } from './data';
import { localizeSampleNote } from './sample-notes';
import { LANGS } from '@/app/languages';
import { editorDocumentToHtml } from './document-codec';
import { BACKUP_LIMITS, createWorkspaceBackup, parseWorkspaceBackup, prepareWorkspaceRestore, serializeWorkspaceBackup, type BackupSettings, type WorkspaceBackup } from './workspace-backup';

const settings: BackupSettings = { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' };
const exportedAt = '2026-09-15T00:00:00.000Z';
const fresh = () => createWorkspaceBackup({ notes, groups, settings }, document, exportedAt);
const rejected = (mutate: (backup: WorkspaceBackup) => void, message?: string) => {
  const value = fresh();mutate(value);
  expect(() => parseWorkspaceBackup(JSON.stringify(value))).toThrow(message);
};

describe('workspace backup', () => {
  it.each(LANGS)('round-trips the entire sample workspace in %s', language => {
    const source = { notes: notes.map(note => localizeSampleNote(note, language, 'Ctrl')), groups, settings: { ...settings, language } };
    const before = JSON.stringify(source);
    const backup = createWorkspaceBackup(source, document, exportedAt);
    expect(parseWorkspaceBackup(serializeWorkspaceBackup(backup))).toEqual(backup);
    expect(backup.notes.map(note => note.id)).toEqual(notes.map(note => note.id));
    expect(backup.groups.map(group => group.id)).toEqual(groups.map(group => group.id));
    expect(backup.settings).toEqual(source.settings);
    expect(backup.notes[4].parentId).toBe('note-3');
    expect(backup.notes[0].sampleKey).toBe('welcome');
    expect(JSON.stringify(source)).toBe(before);
  });

  it('preserves untitled names, edited examples, separators, ordering and deleted/completed states', () => {
    const sourceNotes = [
      { ...notes[2], title: '', content: '<p>Edited {{Mod}}</p>', sampleKey: undefined, isDeleted: true, isCompleted: true, stars: 3 as const },
      { ...notes[5], id: 'sep-new', type: 'separator' as const, title: '', content: '<p></p>', sampleKey: undefined },
      ...notes.filter(note => note.id !== 'note-3'),
    ];
    const backup = createWorkspaceBackup({ notes: sourceNotes, groups: [...groups, { id: 'blank', name: '', type: 'group' }, { id: 'line', name: '', type: 'separator' }], settings }, document, exportedAt);
    expect(backup.groups.at(-2)?.name).toBe('');
    expect(backup.groups.at(-1)?.type).toBe('separator');
    expect(backup.notes[0].sampleKey).toBeUndefined();
    expect(backup.notes[0].isDeleted).toBe(true);
    expect(backup.notes[0].isCompleted).toBe(true);
    expect(backup.notes[0].document.document.content?.[0].content).toBeUndefined();
    expect(editorDocumentToHtml(backup.notes[0].document, document)).toContain('Edited {{Mod}}');
  });

  it('encodes literal title markup safely and retains supported title color tags', () => {
    const note = { ...notes[5], title: '<img src=x onerror=alert(1)> {color:#64A364}Green{/color}', sampleKey: undefined };
    const value = createWorkspaceBackup({ groups, notes: [note], settings }, document, exportedAt);
    const html = editorDocumentToHtml(value.notes[0].document, document);
    expect(html).toContain('&lt;img');expect(html).not.toContain('<img');
    expect(html).toContain('rgb(100, 163, 100)');
  });

  it('returns a detached restore candidate with collisions, without touching existing data', () => {
    const backup = fresh();
    const existing = { noteIds: ['note-1', 'private-note'], groupIds: ['inbox'] };
    const before = JSON.stringify(existing);
    const plan = prepareWorkspaceRestore(serializeWorkspaceBackup(backup), existing);
    expect(plan.conflicts).toEqual({ noteIds: ['note-1'], groupIds: ['inbox'] });
    expect(plan.summary).toEqual({ notes: 9, groups: 5, deletedNotes: 0 });
    expect(JSON.stringify(existing)).toBe(before);
    plan.backup.groups[0].name = 'Changed candidate';
    expect(groups[0].name).toBe('Inbox');expect(backup.groups[0].name).toBe('Inbox');
  });

  it('rejects unsupported versions, malformed data and extra authority fields', () => {
    expect(() => parseWorkspaceBackup('{')).toThrow('Invalid JSON');
    rejected(value => { Object.assign(value, { version: 2 }); }, 'version');
    rejected(value => { Object.assign(value.settings, { plan: 'pro' }); }, 'Unsupported field');
    rejected(value => { value.notes[0].createdAt = 'not-a-date'; }, 'timestamp');
    rejected(value => { Object.assign(value.notes[0], { isCompleted: 'true' }); }, 'boolean');
    rejected(value => { value.notes[0].document.schemaVersion = 2 as 1; }, 'version');
    const encoded = serializeWorkspaceBackup(fresh());
    expect(() => parseWorkspaceBackup(encoded.replace('"format":', '"__proto__":{},"format":'))).toThrow('Unsupported field');
  });

  it('rejects duplicate IDs, missing groups, invalid sample markers and parent cycles', () => {
    rejected(value => { value.groups.push(value.groups[0]); }, 'Duplicate');
    rejected(value => { value.notes.push(value.notes[0]); }, 'Duplicate');
    rejected(value => { value.notes[0].group = 'missing'; }, 'parent group');
    rejected(value => { value.notes[2].sampleKey = 'welcome'; }, 'sample');
    rejected(value => { value.notes[2].parentId = 'missing'; }, 'parent note');
    rejected(value => { value.notes[2].parentId = 'note-5'; }, 'Cyclic');
    rejected(value => { value.groups[0].isDeleted = true; }, 'Inbox');
  });

  it.each(['javascript:alert(1)', 'data:text/html,test', 'vbscript:test', ' javaScript:alert(1)', 'https://user:pass@example.com/'])('rejects unsafe link URL %s', href => {
    rejected(value => { value.notes[5].document.document.content = [{ type: 'title' }, { type: 'paragraph', content: [{ type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href } }] }] }]; });
  });

  it.each(['https://example.com/path', 'mailto:hello@example.com', 'tel:+810000000000', '/app/', '#section'])('accepts supported link URL %s', href => {
    const value = fresh();
    value.notes[5].document.document.content = [{ type: 'title' }, { type: 'paragraph', content: [{ type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } }] }] }];
    expect(parseWorkspaceBackup(JSON.stringify(value))).toEqual(value);
  });

  it('rejects script nodes, event/style injection, invalid levels and excessive spans', () => {
    rejected(value => { value.notes[5].document.document.content = [{ type: 'title' }, { type: 'script' }]; }, 'node type');
    rejected(value => { value.notes[5].document.document.content![0].attrs = { level: 1, onclick: 'alert(1)' }; }, 'Unsupported field');
    rejected(value => { value.notes[5].document.document.content![0].attrs = { level: 8 }; }, 'range');
    rejected(value => { value.notes[5].document.document.content![1] = { type: 'paragraph', content: [{ type: 'text', text: 'Color', marks: [{ type: 'textStyle', attrs: { color: 'url(javascript:alert(1))' } }] }] }; }, 'color');
    rejected(value => { value.notes[5].document.document.content![1] = { type: 'tableCell', attrs: { colspan: 99999 } }; }, 'range');
  });

  it('rejects oversized files, oversized collections and deeply nested documents', () => {
    expect(() => parseWorkspaceBackup(' '.repeat(BACKUP_LIMITS.bytes + 1))).toThrow('size');
    expect(() => parseWorkspaceBackup('あ'.repeat(Math.floor(BACKUP_LIMITS.bytes / 3) + 1))).toThrow('size');
    rejected(value => { value.groups = Array(BACKUP_LIMITS.groups + 1).fill(value.groups[0]); }, 'count');
    rejected(value => { let node = value.notes[5].document.document.content![1];for (let i = 0; i < 40; i++) node = { type: 'blockquote', content: [node] };value.notes[5].document.document.content![1] = node; }, 'complexity');
  });

  it('rejects link opener access, invalid table grids and oversized table expansion', () => {
    rejected(value => { value.notes[5].document.document.content![1] = { type: 'paragraph', content: [{ type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href: 'https://example.com', rel: 'opener' } }] }] }; }, 'relation');
    rejected(value => { value.notes[5].document.document.content![1] = { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 2 }, content: [{ type: 'paragraph' }] }] }, { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph' }] }] }] }; }, 'geometry');
    rejected(value => { value.notes[5].document.document.content![1] = { type: 'table', content: Array.from({ length: 40 }, () => ({ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 100 }, content: [{ type: 'paragraph' }] }] })) }; }, 'complexity');
  });

  it('does not silently discard legacy nested children', () => {
    expect(() => createWorkspaceBackup({ groups, settings, notes: [{ ...notes[5], children: [] }] }, document)).toThrow('Flatten children');
  });
});
