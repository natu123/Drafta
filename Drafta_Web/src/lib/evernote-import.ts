import { ENEX_FILE_BYTES, expandArchives } from './import-archive';
import { importedHtmlToDrafta, parseInertHtml, type HtmlImportLabels, type ImportedTask } from './imported-html';
import {
  buildImportedNote, createImportBudget, displayPath, IMPORT_RAW_FILE_BYTES, isoTime, orderPlanNotes, planIsFull, segmentsOf,
  type ImportFile, type ImportPlan, type PlanOptions, type SkippedFile,
} from './obsidian-import';
import { blobStream } from './zip';
import type { Group, Note } from './types';

/**
 * Evernote ENEX import (specs/20). Each .enex file (one notebook) becomes a tray named after the
 * file. The file is read in pieces and cut at each <note>; attachment data (<resource>) is
 * skipped without being kept. The file's DOCTYPE is never parsed, so no entity is ever declared
 * or expanded, and each note is parsed on its own as XML.
 */

export type EvernotePlanOptions = Omit<PlanOptions, 'labels'> & { labels: HtmlImportLabels & { evernote: string } };

// One note without its attachments; larger notes are reported as too large.
export const ENEX_NOTE_CHARS = 8 * 1024 * 1024;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** The XML of each note in an ENEX stream, without its <resource> elements; null for an oversized note. */
export async function* enexNotes(stream: ReadableStream<Uint8Array>): AsyncGenerator<string | null> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let note: string | null = null;
  let resource = false;
  let oversized = false;
  // A consumer that stops early (limits reached, import cancelled) also stops the reading.
  try {
    for (let done = false; !done;) {
      const chunk = await reader.read();
      done = chunk.done;
      buffer += done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
      for (;;) {
        if (note === null) {
          const start = buffer.search(/<note[\s>]/);
          if (start < 0) { buffer = buffer.slice(-8); break; }
          buffer = buffer.slice(start);
          note = '';
          oversized = false;
          continue;
        }
        if (resource) {
          const end = buffer.indexOf('</resource>');
          if (end < 0) { buffer = buffer.slice(-12); break; }
          buffer = buffer.slice(end + 11);
          resource = false;
          continue;
        }
        const close = buffer.indexOf('</note>');
        const attachment = buffer.search(/<resource[\s>]/);
        if (close >= 0 && (attachment < 0 || close < attachment)) {
          const xml = note + buffer.slice(0, close + 7);
          buffer = buffer.slice(close + 7);
          note = null;
          yield oversized || xml.length > ENEX_NOTE_CHARS ? null : xml;
          continue;
        }
        const take = attachment >= 0 ? attachment : Math.max(0, buffer.length - 12);
        if (!oversized) note += buffer.slice(0, take);
        buffer = buffer.slice(take);
        if (note.length > ENEX_NOTE_CHARS) { oversized = true; note = ''; }
        if (attachment >= 0) { resource = true; continue; }
        break;
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
}

const ENEX_TIME = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
export function parseEnexTime(value: string | null): number | null {
  const match = ENEX_TIME.exec(value?.trim() ?? '');
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, day, hour, minute, second);
  return year >= 1970 && new Date(time).getUTCDate() === day ? time : null;
}

type EnexNote = { title: string; content: string; created: number | null; updated: number | null; tags: string[]; tasks: (ImportedTask & { group: string; sort: string })[] };

/** One <note> element on its own; throws when it is not well-formed XML. */
export function parseEnexNote(xml: string, dom: Document): EnexNote {
  const Parser = dom.defaultView?.DOMParser ?? DOMParser;
  const parsed = new Parser().parseFromString(xml, 'application/xml');
  const root = parsed.documentElement;
  if (parsed.getElementsByTagName('parsererror').length || root?.localName !== 'note') throw new Error('Invalid ENEX note');
  const children = (parent: Element, name: string) => Array.from(parent.children).filter(child => child.localName === name);
  const text = (parent: Element, name: string) => children(parent, name)[0]?.textContent ?? null;
  return {
    title: (text(root, 'title') ?? '').replace(/\s+/g, ' ').trim(),
    content: text(root, 'content') ?? '',
    created: parseEnexTime(text(root, 'created')),
    updated: parseEnexTime(text(root, 'updated')),
    tags: children(root, 'tag').map(tag => (tag.textContent ?? '').trim().replace(/\s+/g, '_').replace(/^#/, '')).filter(Boolean),
    tasks: children(root, 'task').map(task => ({ title: text(task, 'title') ?? '', done: text(task, 'taskStatus')?.trim() === 'completed',
      group: text(task, 'taskGroupNoteLevelID')?.trim() ?? '', sort: text(task, 'sortWeight') ?? '' })),
  };
}

/** ENML as an inert HTML fragment. XML self-closing tags are not void in HTML (<div/> would swallow what follows). */
export function enmlFragment(enml: string, dom: Document): Node {
  // No class here can run past the next "<", so repeated unclosed tags stay linear.
  const source = enml.replace(/<\?xml[^<>]*\?>/gi, '').replace(/<!DOCTYPE[^<>]*>/gi, '')
    .replace(/<([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"<]*"|'[^'<]*'|[^\s"'<>]+))?){0,64})\s*\/>/g,
      (match, tag: string, attributes: string) => VOID.has(tag.toLowerCase()) ? match : `<${tag}${attributes}></${tag}>`);
  const fragment = parseInertHtml(source, dom);
  return fragment.querySelector('en-note') ?? fragment;
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function planEvernoteImport(files: ImportFile[], options: EvernotePlanOptions): Promise<ImportPlan> {
  const skipped: SkippedFile[] = [];
  const groups: Group[] = [];
  const notes: Note[] = [];
  const noteBytes = new Map<string, number>();
  const counter = { embeds: 0 };
  const budget = createImportBudget();
  let total = 0;
  for (const file of await expandArchives(files, skipped, budget, options.signal)) {
    if (planIsFull(notes.length, total)) break;
    const path = displayPath(file);
    const name = segmentsOf(file.path).pop() ?? '';
    if (name.startsWith('.') || segmentsOf(file.path).includes('__MACOSX')) continue;
    if (!/\.enex$/i.test(name)) { skipped.push({ path, reason: 'unsupported' }); continue; }
    if (file.size > ENEX_FILE_BYTES) { skipped.push({ path, reason: 'tooLarge' }); continue; }
    const group: Group = { id: `group-${options.newId()}`, name: name.replace(/\.enex$/i, '').trim() || options.labels.evernote, type: 'group' };
    const before = notes.length;
    let index = 0;
    try {
      const stream = file.stream?.() ?? (file.blob ? blobStream(file.blob) : null);
      if (!stream) throw new Error('No stream');
      for await (const xml of enexNotes(stream)) {
        index++;
        options.signal?.throwIfAborted();
        // Past the memo or size limit the import cannot be saved: stop reading (the preview shows the limit).
        if (planIsFull(notes.length, total)) break;
        let label = `${path} #${index}`;
        if (xml === null) { skipped.push({ path: label, reason: 'tooLarge' }); continue; }
        try {
          const note = parseEnexNote(xml, options.dom);
          if (note.title) label = `${path}: ${note.title}`;
          if (note.content.length > IMPORT_RAW_FILE_BYTES) { skipped.push({ path: label, reason: 'tooLarge' }); continue; }
          const taskGroups = new Map<string, ImportedTask[]>();
          for (const task of [...note.tasks].sort((a, b) => a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0)) {
            const group = taskGroups.get(task.group);
            if (group) group.push({ title: task.title, done: task.done }); else taskGroups.set(task.group, [{ title: task.title, done: task.done }]);
          }
          const body = importedHtmlToDrafta(enmlFragment(note.content, options.dom), { labels: options.labels, counter, taskGroups });
          const tags = note.tags.length ? `<p>${escapeHtml(note.tags.map(tag => `#${tag}`).join(' '))}</p>` : '';
          const created = isoTime(note.created ?? note.updated ?? file.lastModified);
          const updated = isoTime(note.updated ?? note.created ?? file.lastModified);
          const built = buildImportedNote({ title: note.title, html: body + tags, group, createdAt: created, updatedAt: updated < created ? created : updated }, options);
          if (!built) { skipped.push({ path: label, reason: 'tooLarge' }); continue; }
          notes.push(built.note);
          noteBytes.set(built.note.id, built.bytes);
          total += built.bytes;
        } catch (error) {
          if (options.signal?.aborted) throw error;
          skipped.push({ path: label, reason: 'invalid' });
        }
      }
      if (!index) skipped.push({ path, reason: 'invalid' });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      skipped.push({ path, reason: (error as { reason?: SkippedFile['reason'] }).reason ?? 'invalid' });
    }
    if (notes.length > before) groups.push(group);
  }
  return { vaultName: options.labels.evernote, ...orderPlanNotes(groups, notes, options.listStyle), noteBytes, embeds: counter.embeds, skipped };
}
