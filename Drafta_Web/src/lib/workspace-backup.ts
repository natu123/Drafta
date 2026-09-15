import type { JSONContent } from '@tiptap/core';
import { documentSchema } from '@/components/tiptap-extensions/document-schema';
import { TableMap } from '@tiptap/pm/tables';
import { isLang, type Lang } from '@/app/languages';
import { editorHtmlToDocument, type SerializedEditorDocument } from './document-codec';
import type { Group, Note } from './types';

export type BackupSettings = {
  language: Lang | null;
  theme: 'light' | 'dark' | 'system';
  listStyle: 'top' | 'bottom';
  noteSort: 'manual' | 'newest' | 'oldest' | 'last-accessed';
};
export type BackupNote = Omit<Note, 'title' | 'content' | 'plainTextContent' | 'children'> & { document: SerializedEditorDocument };
export type WorkspaceBackup = {
  format: 'drafta-workspace';
  version: 1;
  exportedAt: string;
  groups: Group[];
  notes: BackupNote[];
  settings: BackupSettings;
};

// Defensive import limits, not subscription quotas. Large-file support is a separate milestone.
export const BACKUP_LIMITS = { bytes: 16 * 1024 * 1024, notes: 10000, groups: 1000, nodes: 100000, depth: 32 } as const;

export class BackupValidationError extends Error {
  constructor(public readonly path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'BackupValidationError';
  }
}
function requireValue(condition: unknown, path: string, message: string): asserts condition {
  if (!condition) throw new BackupValidationError(path, message);
}
type RecordValue = Record<string, unknown>;
function record(value: unknown, path: string, allowed: string[]): RecordValue {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), path, 'Expected an object');
  const data = value as RecordValue;
  for (const key of Object.keys(data)) requireValue(allowed.includes(key), path, 'Unsupported field');
  return data;
}
function string(value: unknown, path: string, max = 1000000): asserts value is string {
  requireValue(typeof value === 'string' && value.length <= max && !value.includes('\0'), path, 'Invalid string');
}
function id(value: unknown, path: string): asserts value is string {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value), path, 'Invalid ID');
}
function date(value: unknown, path: string) {
  string(value, path, 30);
  const timestamp = Date.parse(value);
  requireValue(Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value, path, 'Expected a UTC ISO timestamp');
}
function integer(value: unknown, min: number, max: number, path: string) {
  requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max, path, 'Integer out of range');
}
function safeUrl(value: unknown, path: string, image = false) {
  string(value, path, 8192);
  requireValue(value === value.trim() && !/[\u0000-\u0020\u007f\\]/.test(value), path, 'Invalid URL whitespace');
  if (!image && /^(#|\/(?!\/)|\.\.?\/)/.test(value)) return;
  let url: URL;
  try { url = new URL(value); } catch { throw new BackupValidationError(path, 'Invalid URL'); }
  requireValue((image ? ['https:'] : ['https:', 'http:', 'mailto:', 'tel:']).includes(url.protocol), path, 'Unsafe URL scheme');
  requireValue(!url.username && !url.password, path, 'URL credentials are not allowed');
}
function color(value: unknown, path: string) {
  if (value === null) return;
  string(value, path, 80);
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)) return;
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/.exec(value);
  requireValue(rgb && rgb.slice(1, 4).every(channel => Number(channel) <= 255), path, 'Unsupported color');
}

function attributes(type: string, value: unknown, path: string, mark: boolean) {
  const spec = mark ? documentSchema.marks[type] : documentSchema.nodes[type];
  const data = record(value, path, Object.keys(spec.spec.attrs ?? {}));
  for (const [key, item] of Object.entries(data)) {
    const at = `${path}.${key}`;
    if (key === 'level') integer(item, 1, type === 'title' ? 1 : 3, at);
    else if (key === 'start' || key === 'startFrom' || key === 'value') { if (key !== 'value' || item !== null) integer(item, 1, 2147483647, at); }
    else if (key === 'type' && type === 'orderedList') requireValue(item === null || ['1', 'a', 'A', 'i', 'I'].includes(item as string), at, 'Invalid list type');
    else if (key === 'checked') requireValue(typeof item === 'boolean', at, 'Expected a boolean');
    else if (key === 'language') { if (item !== null) requireValue(typeof item === 'string' && /^[\w+-]{0,64}$/.test(item), at, 'Invalid code language'); }
    else if (key === 'colspan' || key === 'rowspan') integer(item, 1, 100, at);
    else if ((type === 'tableCell' || type === 'tableHeader') && key === 'align') requireValue(item === null || ['left', 'center', 'right', 'justify'].includes(item as string), at, 'Invalid cell alignment');
    else if (key === 'colwidth') {
      if (item !== null) {
        requireValue(Array.isArray(item) && item.length === (data.colspan ?? 1), at, 'Column widths must match colspan');
        item.forEach((width, index) => integer(width, 0, 4096, `${at}[${index}]`));
      }
    } else if (type === 'textStyle' && key === 'color') color(item, at);
    else if (type === 'link' && key === 'href') safeUrl(item, at);
    else if (type === 'link' && key === 'target') requireValue(item === null || item === '_blank' || item === '_self', at, 'Unsupported link target');
    else if (type === 'link' && key === 'class') requireValue(item === null, at, 'Custom classes are not allowed');
    else if (type === 'link' && key === 'rel') {
      if (item !== null) {
        string(item, at, 128);
        requireValue(item.split(/\s+/).filter(Boolean).every(token => ['noopener', 'noreferrer', 'nofollow', 'ugc', 'sponsored'].includes(token)), at, 'Unsafe link relation');
      }
    }
    else if (type === 'link' && key === 'title') { if (item !== null) string(item, at, 1024); }
    else throw new BackupValidationError(at, 'Unsupported attribute');
  }
}

function documentValue(value: unknown, path: string, budget: { nodes: number; tableSlots: number }) {
  const envelope = record(value, path, ['format', 'schemaVersion', 'document']);
  requireValue(envelope.format === 'drafta-document' && envelope.schemaVersion === 1, path, 'Unsupported document version');
  const walk = (raw: unknown, at: string, depth: number) => {
    requireValue(depth <= BACKUP_LIMITS.depth && ++budget.nodes <= BACKUP_LIMITS.nodes, at, 'Document complexity limit exceeded');
    const node = record(raw, at, ['type', 'attrs', 'content', 'marks', 'text']);
    requireValue(typeof node.type === 'string' && Object.hasOwn(documentSchema.nodes, node.type), at, 'Unknown node type');
    if (node.attrs !== undefined) attributes(node.type, node.attrs, `${at}.attrs`, false);
    if (node.text !== undefined) { requireValue(node.type === 'text', at, 'Text on a non-text node');string(node.text, `${at}.text`); }
    if (node.marks !== undefined) {
      requireValue(Array.isArray(node.marks) && node.marks.length <= 8, `${at}.marks`, 'Invalid marks');
      const seen = new Set<string>();
      node.marks.forEach((rawMark, index) => {
        const markPath = `${at}.marks[${index}]`;
        const mark = record(rawMark, markPath, ['type', 'attrs']);
        requireValue(typeof mark.type === 'string' && Object.hasOwn(documentSchema.marks, mark.type) && !seen.has(mark.type), markPath, 'Unknown or duplicate mark');
        seen.add(mark.type);
        if (mark.attrs !== undefined) attributes(mark.type, mark.attrs, `${markPath}.attrs`, true);
      });
    }
    if (node.content !== undefined) {
      requireValue(Array.isArray(node.content) && node.content.length <= BACKUP_LIMITS.nodes, `${at}.content`, 'Invalid content');
      node.content.forEach((child, index) => walk(child, `${at}.content[${index}]`, depth + 1));
    }
  };
  walk(envelope.document, `${path}.document`, 0);
  try {
    const node = documentSchema.nodeFromJSON(envelope.document as JSONContent);
    requireValue(node.type === documentSchema.topNodeType, path, 'Expected a complete document');
    node.check();
    node.descendants(child => {
      if (child.type.name !== 'table') return;
      // Conservative bound before TableMap allocates a grid for untrusted spans.
      let widths = 0;
      child.forEach(row => row.forEach(cell => { widths += cell.attrs.colspan; }));
      budget.tableSlots += child.childCount * widths;
      requireValue(budget.tableSlots <= BACKUP_LIMITS.nodes, path, 'Table complexity limit exceeded');
      requireValue(!TableMap.get(child).problems?.length, path, 'Invalid table geometry');
    });
  } catch (error) { if (error instanceof BackupValidationError) throw error;throw new BackupValidationError(path, 'Invalid document structure'); }
}

function validate(value: unknown): asserts value is WorkspaceBackup {
  const data = record(value, 'backup', ['format', 'version', 'exportedAt', 'groups', 'notes', 'settings']);
  requireValue(data.format === 'drafta-workspace' && data.version === 1, 'backup', 'Unsupported backup version');
  date(data.exportedAt, 'exportedAt');
  requireValue(Array.isArray(data.groups) && data.groups.length <= BACKUP_LIMITS.groups, 'groups', 'Invalid group count');
  requireValue(Array.isArray(data.notes) && data.notes.length <= BACKUP_LIMITS.notes, 'notes', 'Invalid note count');
  const settings = record(data.settings, 'settings', ['language', 'theme', 'listStyle', 'noteSort']);
  requireValue(settings.language === null || isLang(settings.language), 'settings.language', 'Unknown language');
  requireValue(['light', 'dark', 'system'].includes(settings.theme as string), 'settings.theme', 'Unknown theme');
  requireValue(['top', 'bottom'].includes(settings.listStyle as string), 'settings.listStyle', 'Unknown list style');
  requireValue(['manual', 'newest', 'oldest', 'last-accessed'].includes(settings.noteSort as string), 'settings.noteSort', 'Unknown sort');
  const groups = new Map<string, RecordValue>();
  data.groups.forEach((raw, index) => {
    const path = `groups[${index}]`;const group = record(raw, path, ['id', 'name', 'type', 'isDeleted']);
    id(group.id, `${path}.id`);string(group.name, `${path}.name`, 10000);
    requireValue(!groups.has(group.id), path, 'Duplicate group ID');
    requireValue(group.type === undefined || group.type === 'group' || group.type === 'separator', path, 'Unknown group type');
    if (group.isDeleted !== undefined) requireValue(typeof group.isDeleted === 'boolean', path, 'Invalid deletion state');
    groups.set(group.id, group);
  });
  const inbox = groups.get('inbox');
  requireValue(inbox && inbox.type !== 'separator' && !inbox.isDeleted, 'groups', 'An active Inbox is required by the current app');
  const notes = new Map<string, RecordValue>();
  const budget = { nodes: 0, tableSlots: 0 };
  const samples: Record<string, string> = { 'note-1': 'welcome', 'note-2': 'reference', 'note-3': 'brainstorm', 'note-4': 'groceries', 'note-5': 'meeting', 'note-6': 'todo', 'note-7': 'todo', 'note-8': 'todo', 'note-9': 'todo' };
  data.notes.forEach((raw, index) => {
    const path = `notes[${index}]`;
    const note = record(raw, path, ['id', 'type', 'icon', 'group', 'stars', 'createdAt', 'updatedAt', 'lastAccessedAt', 'thumbnailUrl', 'isPinned', 'isCompleted', 'parentId', 'isDeleted', 'isProtected', 'sampleKey', 'document']);
    id(note.id, `${path}.id`);id(note.group, `${path}.group`);
    requireValue(!notes.has(note.id), path, 'Duplicate note ID');
    requireValue(note.type === undefined || note.type === 'note' || note.type === 'separator', path, 'Unknown note type');
    requireValue(groups.has(note.group) && groups.get(note.group)?.type !== 'separator', path, 'Unknown or invalid parent group');
    integer(note.stars, 0, 3, `${path}.stars`);date(note.createdAt, `${path}.createdAt`);date(note.updatedAt, `${path}.updatedAt`);
    if (note.lastAccessedAt !== undefined) date(note.lastAccessedAt, `${path}.lastAccessedAt`);
    if (note.icon !== undefined) string(note.icon, `${path}.icon`, 128);
    if (note.thumbnailUrl !== undefined) safeUrl(note.thumbnailUrl, `${path}.thumbnailUrl`, true);
    for (const key of ['isPinned', 'isCompleted', 'isDeleted', 'isProtected']) if (note[key] !== undefined) requireValue(typeof note[key] === 'boolean', `${path}.${key}`, 'Expected a boolean');
    if (note.parentId !== undefined) id(note.parentId, `${path}.parentId`);
    if (note.sampleKey !== undefined) requireValue(Object.hasOwn(samples, note.id) && samples[note.id] === note.sampleKey && note.type !== 'separator', path, 'Invalid sample identity');
    if (note.id === 'note-1' || note.id === 'note-2') requireValue(note.isProtected === true && !note.isDeleted && note.type !== 'separator', path, 'Invalid protected sample state');
    documentValue(note.document, `${path}.document`, budget);
    notes.set(note.id, note);
  });
  const checked = new Set<string>();
  for (const note of notes.values()) {
    const path = new Set<string>();let current: RecordValue | undefined = note;
    while (current && !checked.has(current.id as string)) {
      requireValue(!path.has(current.id as string), 'notes.parentId', 'Cyclic parent reference');path.add(current.id as string);
      if (current.parentId === undefined) break;
      const parent: RecordValue | undefined = notes.get(current.parentId as string);
      requireValue(parent && parent.type !== 'separator', 'notes.parentId', 'Missing or invalid parent note');current = parent;
    }
    path.forEach(noteId => checked.add(noteId));
  }
}

export function parseWorkspaceBackup(text: string): WorkspaceBackup {
  requireValue(typeof text === 'string' && text.length <= BACKUP_LIMITS.bytes, 'backup', 'Backup size limit exceeded');
  requireValue(new TextEncoder().encode(text).byteLength <= BACKUP_LIMITS.bytes, 'backup', 'Backup size limit exceeded');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new BackupValidationError('backup', 'Invalid JSON'); }
  validate(value);
  return value;
}

export function serializeWorkspaceBackup(value: WorkspaceBackup): string {
  let text: string;
  try { text = JSON.stringify(value); } catch { throw new BackupValidationError('backup', 'Cannot serialize backup'); }
  parseWorkspaceBackup(text);
  return text;
}

/** Exports trusted, current in-memory app state. Does not read storage or write files. */
export function createWorkspaceBackup(source: { groups: Group[]; notes: Note[]; settings: BackupSettings }, dom: Document, exportedAt = new Date().toISOString()): WorkspaceBackup {
  requireValue(source.notes.length <= BACKUP_LIMITS.notes && source.groups.length <= BACKUP_LIMITS.groups, 'backup', 'Collection size limit exceeded');
  let inputBytes = 0;
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const notes = source.notes.map(note => {
    const { title, content, plainTextContent: _preview, children, ...metadata } = note;
    void _preview; // Derived display text is regenerated, not a second content source.
    requireValue(title.length <= BACKUP_LIMITS.bytes && content.length <= BACKUP_LIMITS.bytes, 'backup', 'Backup size limit exceeded');
    inputBytes += new TextEncoder().encode(title).byteLength + new TextEncoder().encode(content).byteLength;
    requireValue(inputBytes <= BACKUP_LIMITS.bytes, 'backup', 'Backup size limit exceeded');
    requireValue(children === undefined, `notes.${note.id}.children`, 'Flatten children into parentId references before export');
    const titleHtml = escape(title).replace(/\{color:(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\}(.+?)\{\/color\}/g, '<span style="color:$1">$2</span>');
    return { ...metadata, document: editorHtmlToDocument(`<h1>${titleHtml}</h1>${content}`, dom) };
  });
  return parseWorkspaceBackup(JSON.stringify({ format: 'drafta-workspace', version: 1, exportedAt, groups: source.groups, notes, settings: source.settings }));
}

/** A candidate for user review; never merges into or mutates the existing workspace. */
export function prepareWorkspaceRestore(text: string, existing: { noteIds: readonly string[]; groupIds: readonly string[] }) {
  const backup = parseWorkspaceBackup(text);
  const noteIds = new Set(existing.noteIds), groupIds = new Set(existing.groupIds);
  return {
    backup,
    summary: { notes: backup.notes.filter(note => note.type !== 'separator').length, groups: backup.groups.filter(group => group.type !== 'separator').length, deletedNotes: backup.notes.filter(note => note.isDeleted).length },
    conflicts: { noteIds: backup.notes.filter(note => noteIds.has(note.id)).map(note => note.id), groupIds: backup.groups.filter(group => groupIds.has(group.id)).map(group => group.id) },
  };
}
