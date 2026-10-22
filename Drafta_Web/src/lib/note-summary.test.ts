/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { notes, groups } from './data';
import { localizeSampleNote } from './sample-notes';
import { createWorkspaceBackup, parseStoredDocument, snapshotWorkspace, trustAssembledBackup, type BackupSettings } from './workspace-backup';
import { EXCERPT_LENGTH, noteMetadata, parseSummary, summarizeNote, summaryMatches, summaryText, validateSummaries } from './note-summary';
import { noteWithContent, summariesToState, workspaceToState } from './workspace-state';
import { attachBody, hasBody } from './note-source';
import { previewText, previewTextStart } from './note-text';

const settings: BackupSettings = { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' };
const date = '2026-09-28T00:00:00.000Z';
// Rich bodies as ordinary memos, so they are neither localized nor read-only samples.
const backup = () => createWorkspaceBackup({ notes: notes.map(note => ({ ...localizeSampleNote(note, 'ja', 'Ctrl'), sampleKey: undefined })), groups, settings }, document, date);

describe('memo summaries (specs/17)', () => {
  it('keeps every field but the body, with the title and the start of the preview text', () => {
    const value = backup();
    const state = workspaceToState(value, document);
    for (const [index, note] of value.notes.entries()) {
      const summary = summarizeNote(note);
      const { document: _body, ...metadata } = note;
      void _body;
      expect(noteMetadata(summary)).toEqual(metadata);
      expect(summary.title).toBe(state.notes[index].title);
      expect(summary.excerpt).toBe(Array.from(state.notes[index].plainTextContent!).slice(0, EXCERPT_LENGTH).join(''));
      expect(parseSummary(summaryText(note), note.id)).toEqual(summary);
    }
    expect(value.notes.some(note => Array.from(summarizeNote(note).excerpt).length === EXCERPT_LENGTH)).toBe(true);
  });

  it('reads only the start of a long memo for its excerpt, with the same result as the whole text', () => {
    const paragraph = (text: string) => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : undefined });
    const doc = (...texts: string[]) => ({ format: 'drafta-document' as const, schemaVersion: 1 as const, document: { type: 'doc', content: [{ type: 'title' }, ...texts.map(paragraph)] } });
    const cases = [
      doc('short'), doc('', '  ', ''), doc('  leading and trailing  '),
      doc('😀'.repeat(250)), doc('a'.repeat(199), ' ', '😀😀', 'b'.repeat(500)),
      doc(...Array.from({ length: 300 }, (_, index) => ` line ${index}\n\t`)),
      doc('x'.repeat(400), '   ', 'y'), doc('あ'.repeat(201)),
    ];
    for (const value of cases) {
      for (const count of [1, 2, 199, 200, 201]) {
        expect(previewTextStart(value, count)).toBe(Array.from(previewText(value)).slice(0, count).join(''));
      }
    }
  });

  it('refuses summaries that do not belong to the memo or do not validate as a workspace', () => {
    const value = backup();
    const summary = summarizeNote(value.notes[0]);
    expect(() => parseSummary(JSON.stringify(summary), 'other')).toThrow('Memo ID mismatch');
    expect(() => parseSummary(JSON.stringify({ ...summary, excerpt: 'x'.repeat(EXCERPT_LENGTH + 1) }), summary.id)).toThrow('Invalid excerpt');
    expect(() => parseSummary('{', summary.id)).toThrow('Invalid JSON');
    const { notes: _notes, ...envelope } = value;
    void _notes;
    expect(() => validateSummaries(envelope, value.notes.map(summarizeNote))).not.toThrow();
    expect(() => validateSummaries(envelope, [{ ...summary, group: 'missing' }])).toThrow('Unknown or invalid parent group');
    expect(() => validateSummaries(envelope, [{ ...summary, plan: 'pro' } as never])).toThrow('Unsupported field');
  });

  it('tells a summary that disagrees with its body', () => {
    const value = backup();
    const summary = summarizeNote(value.notes[1]);
    expect(summaryMatches(summary, value.notes[1])).toBe(true);
    expect(summaryMatches({ ...summary, title: 'Other' }, value.notes[1])).toBe(false);
    expect(summaryMatches({ ...summary, excerpt: 'Other' }, value.notes[1])).toBe(false);
  });

  it('shows the list from summaries and saves nothing until every body has arrived', () => {
    const value = backup();
    const { notes: stored, ...envelope } = value;
    const state = summariesToState(envelope, stored.map(summarizeNote));
    expect(state.notes.map(note => note.title)).toEqual(workspaceToState(value, document).notes.map(note => note.title));
    expect(state.notes.every(note => !hasBody(note))).toBe(true);
    expect(() => noteWithContent(state.notes[0], document)).toThrow('Memo body is not loaded');
    expect(() => snapshotWorkspace(state, document, date)).toThrow('Memo body is not loaded');
    // Bodies arrive as validated, frozen documents, then the memos open and save as stored.
    stored.forEach((note, index) => attachBody(state.notes[index].source!, parseStoredDocument(JSON.stringify(note.document), `notes.${note.id}`)));
    expect(state.notes.every(hasBody)).toBe(true);
    expect(noteWithContent(state.notes[0], document).content).toBe(workspaceToState(value, document).notes[0].content);
    expect(snapshotWorkspace(state, document, date)).toEqual(value);
  });

  it('trusts a workspace assembled from stored bodies without walking them again', () => {
    const value = backup();
    const bodies = value.notes.map(note => parseStoredDocument(JSON.stringify(note.document), `notes.${note.id}`));
    expect(Object.isFrozen(bodies[0])).toBe(true);
    const assembled = trustAssembledBackup(JSON.parse(JSON.stringify({ ...value, notes: [] })) && { ...value, notes: value.notes.map((note, index) => ({ ...note, document: bodies[index] })) }, 1000);
    expect(assembled.notes[0].document).toBe(bodies[0]);
    expect(() => trustAssembledBackup({ ...value, notes: [{ ...value.notes[0], document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [] } } }] }, 1000)).toThrow();
    expect(() => trustAssembledBackup(value, 64 * 1024 * 1024 + 1)).toThrow('Backup size limit exceeded');
  });
});
