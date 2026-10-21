import { BackupValidationError, checkWorkspaceShape, type BackupNote, type WorkspaceBackup } from './workspace-backup';
import { previewText, titleText } from './note-text';

/**
 * A memo without its body (specs/17): what the list and search need before the body arrives.
 * Stored as `notes/{id}.summaryJson`; the body is `bodies/{id}.documentJson`.
 */
export type NoteSummary = Omit<BackupNote, 'document'> & { title: string; excerpt: string };
export type WorkspaceEnvelope = Omit<WorkspaceBackup, 'notes'>;
export type NoteMetadata = Omit<BackupNote, 'document'>;

/** Characters (code points) of preview text kept in a summary. */
export const EXCERPT_LENGTH = 200;
const TITLE_LENGTH = 100000;

export const excerptOf = (document: BackupNote['document']) => Array.from(previewText(document)).slice(0, EXCERPT_LENGTH).join('');

// Stored memos are frozen and reused while unchanged, so each is summarized once.
const summaries = new WeakMap<BackupNote, { summary: NoteSummary; text: string }>();
function summaryEntry(note: BackupNote) {
  let entry = summaries.get(note);
  if (!entry) {
    const { document, ...metadata } = note;
    const summary = { ...metadata, title: titleText(document.document.content![0]), excerpt: excerptOf(document) };
    entry = { summary, text: JSON.stringify(summary) };
    if (Object.isFrozen(note)) summaries.set(note, entry);
  }
  return entry;
}
export const summarizeNote = (note: BackupNote): NoteSummary => summaryEntry(note).summary;
/** The stored `summaryJson` of a memo. */
export const summaryText = (note: BackupNote): string => summaryEntry(note).text;

export function noteMetadata(summary: NoteSummary): NoteMetadata {
  const { title: _title, excerpt: _excerpt, ...metadata } = summary;
  void _title; void _excerpt;
  return metadata;
}

/** Reads one stored summary. Its memo fields are checked with the whole set in validateSummaries. */
export function parseSummary(text: unknown, id: string): NoteSummary {
  const path = `notes.${id}.summary`;
  if (typeof text !== 'string') throw new BackupValidationError(path, 'Missing summary');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new BackupValidationError(path, 'Invalid JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BackupValidationError(path, 'Expected an object');
  const summary = value as Record<string, unknown>;
  if (summary.id !== id) throw new BackupValidationError(path, 'Memo ID mismatch');
  if (typeof summary.title !== 'string' || summary.title.length > TITLE_LENGTH || summary.title.includes('\0')) throw new BackupValidationError(`${path}.title`, 'Invalid title');
  if (typeof summary.excerpt !== 'string' || Array.from(summary.excerpt).length > EXCERPT_LENGTH || summary.excerpt.includes('\0')) throw new BackupValidationError(`${path}.excerpt`, 'Invalid excerpt');
  return summary as NoteSummary;
}

// The smallest valid body, so the workspace validator checks every other field of the summaries.
const PLACEHOLDER = { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'title' }, { type: 'paragraph' }] } };

/** Trays, settings, IDs, fields and parents of the summaries, as a workspace would be checked. */
export function validateSummaries(envelope: WorkspaceEnvelope, list: NoteSummary[]): void {
  checkWorkspaceShape({ ...envelope, notes: list.map(summary => ({ ...noteMetadata(summary), document: PLACEHOLDER })) });
}

/** A stored summary agrees with its stored body: same title and excerpt as made from the body. */
export function summaryMatches(summary: NoteSummary, note: BackupNote): boolean {
  const made = summarizeNote(note);
  return made.title === summary.title && made.excerpt === summary.excerpt;
}
