import { expandArchives } from './import-archive';
import { importedHtmlToDrafta, parseInertHtml, type HtmlImportLabels } from './imported-html';
import { BACKUP_LIMITS } from './workspace-backup';
import {
  buildImportedNote, createImportBudget, displayPath, isoTime, naturalOrder, obsidianMarkdownToHtml, orderPlanNotes, planIsFull, readImportText, segmentsOf,
  TABLE_SLOTS, type ImportFile, type ImportPlan, type PlanOptions, type SkippedFile,
} from './obsidian-import';
import type { Group, Note } from './types';

/**
 * Notion export import (specs/20): "Markdown & CSV" or "HTML", as the exported ZIP (also split
 * parts) or its extracted folder. Each page becomes a memo; a top-level page with subpages becomes
 * a tray holding it and everything under it, and other top-level pages share the "Notion" tray.
 */

export type NotionPlanOptions = Omit<PlanOptions, 'labels'> & { labels: HtmlImportLabels & { notion: string } };

// Notion appends a 32-digit ID (sometimes a dashed UUID) to every exported file and folder name.
const NOTION_ID = /[ -]?(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const SYNTHETIC_ROOT = /^Export-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const PAGE = /\.(md|html?)$/i;
const CSV = /(_all)?\.csv$/i;
const EMOJI = /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u;

export const stripNotionId = (name: string) => name.replace(NOTION_ID, '').trim() || name;
const baseName = (name: string) => name.replace(PAGE, '').replace(CSV, '');
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Notion's Markdown quirks, before the Obsidian converter: the title line, callouts and toggles. */
export function notionMarkdown(text: string): { title: string | null; body: string } {
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let first = 0;
  while (first < lines.length && !lines[first].trim()) first++;
  // Anchored and without a lazy group before trailing spaces: a long line stays linear.
  const heading = /^#[ \t]+(.*)$/.exec(lines[first] ?? '');
  if (heading) lines.splice(0, first + 1);
  const out: string[] = [];
  let aside = false;
  let fence: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (fence) {
      out.push(aside ? `> ${line}` : line);
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    const open = /^(`{3,}|~{3,})/.exec(trimmed);
    if (open) { fence = open[1]; out.push(aside ? `> ${line}` : line); continue; }
    // Notion puts an empty line between all blocks; the converter would keep each as an empty paragraph.
    // Only a table needs one to end before the next table.
    if (!trimmed) { if (/^\s*\|/.test(out[out.length - 1] ?? '')) out.push(''); continue; }
    const oneLine = /^<aside>(.*)<\/aside>$/i.exec(trimmed);
    if (oneLine) { if (oneLine[1].trim()) out.push(`> ${oneLine[1].trim()}`); continue; }
    if (/^<aside>$/i.test(trimmed)) { aside = true; continue; }
    if (/^<\/aside>$/i.test(trimmed)) { aside = false; continue; }
    if (/^<\/?details>$/i.test(trimmed)) continue;
    const summary = /^<summary>(.*)<\/summary>$/i.exec(trimmed);
    if (summary) { out.push(summary[1]); continue; }
    // Line breaks inside a block: a table row cannot hold one.
    const value = line.replace(/<br\s*\/?>/gi, /^\s*\|/.test(line) ? ' ' : '\n');
    if (aside) {
      // The callout's icon image is decoration.
      if (!trimmed || /^<img\b[^>]*>$/i.test(trimmed)) continue;
      out.push(...value.split('\n').map(part => `> ${part.trim()}`));
      continue;
    }
    out.push(value);
  }
  return { title: heading?.[1].trim() || null, body: out.join('\n') };
}

/** RFC 4180 CSV (quoted fields, doubled quotes, line breaks inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^﻿/, '');
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && !field) quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(cells => cells.some(cell => cell.trim()));
}

type Converted = { title: string | null; html: string; icon?: string };

function convertHtmlPage(text: string, options: NotionPlanOptions, counter: { embeds: number }): Converted {
  const page = parseInertHtml(text, options.dom);
  const title = (page.querySelector('.page-title')?.textContent ?? page.querySelector('title')?.textContent ?? '').trim() || null;
  const iconText = page.querySelector('.page-header-icon .icon')?.localName === 'span' ? page.querySelector('.page-header-icon .icon')!.textContent!.trim() : '';
  // The container must belong to the template's inert document: a node moved into the page's document
  // becomes live there (an <img> starts loading and its onerror runs).
  const container = page.ownerDocument.createElement('div');
  const properties = page.querySelector('table.properties');
  if (properties) container.append(properties);
  const body = page.querySelector('.page-body');
  if (body) container.append(...Array.from(body.childNodes));
  else {
    page.querySelectorAll('header, title, style, .page-title').forEach(element => element.remove());
    container.append(...Array.from(page.childNodes));
  }
  return { title, html: importedHtmlToDrafta(container, { labels: options.labels, counter }), icon: EMOJI.test(iconText) ? iconText : undefined };
}

/** A CSV as a table memo; null when it cannot fit in one memo (more rows than a memo has nodes for). */
function convertCsv(text: string, options: NotionPlanOptions, counter: { embeds: number }): Converted | null {
  const rows = parseCsv(text);
  if (rows.length > BACKUP_LIMITS.nodes / 2) return null;
  const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  // Measured before any padding: a wide or long CSV keeps its text as one paragraph per row.
  if (rows.length * rows.length * width > TABLE_SLOTS) {
    return { title: null, html: rows.map(row => `<p>${escapeHtml(row.join(' | '))}</p>`).join('') };
  }
  const table = rows.length ? `<table>${rows.map((row, index) => `<tr>${Array.from({ length: width }, (_, column) => {
    const tag = index === 0 ? 'th' : 'td';
    return `<${tag}>${escapeHtml(row[column] ?? '')}</${tag}>`;
  }).join('')}</tr>`).join('')}</table>` : '';
  return { title: null, html: importedHtmlToDrafta(parseInertHtml(table, options.dom), { labels: options.labels, counter }) };
}

type Entry = { file: ImportFile; raw: string[] };

/** Paths relative to the export: the chosen folder, a synthetic "Export-…" folder or a plain wrapper folder is removed. */
function exportPaths(files: ImportFile[]): Entry[] {
  const groups = new Map<string, Entry[]>();
  for (const file of files) {
    const key = file.archive ?? '';
    groups.set(key, [...(groups.get(key) ?? []), { file, raw: segmentsOf(file.path) }]);
  }
  return [...groups.entries()].flatMap(([archive, entries]) => {
    const roots = new Set(entries.map(entry => entry.raw.length > 1 ? entry.raw[0] : ''));
    const [root] = roots;
    const wrapped = roots.size === 1 && root && (!archive || SYNTHETIC_ROOT.test(root) || !NOTION_ID.test(root));
    return wrapped ? entries.map(entry => ({ ...entry, raw: entry.raw.slice(1) })) : entries;
  }).filter(entry => entry.raw.length > 0);
}

// Tree order: a page, then the folder of its subpages, names in natural order.
function compareEntries(a: Entry, b: Entry) {
  const left = a.raw.map((segment, index) => index === a.raw.length - 1 ? baseName(segment) : segment);
  const right = b.raw.map((segment, index) => index === b.raw.length - 1 ? baseName(segment) : segment);
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const order = naturalOrder(left[index], right[index]);
    if (order) return order;
  }
  return left.length - right.length;
}

export async function planNotionImport(files: ImportFile[], options: NotionPlanOptions): Promise<ImportPlan> {
  const skipped: SkippedFile[] = [];
  const budget = createImportBudget();
  const entries = exportPaths(await expandArchives(files, skipped, budget, options.signal)).filter(entry => !entry.raw.some(segment => segment.startsWith('.')));
  const pathOf = (entry: Entry) => displayPath(entry.file);
  // "Database_all.csv" lists every row; the plain CSV beside it holds only the current view.
  const allCsv = new Set(entries.filter(entry => /_all\.csv$/i.test(entry.raw[entry.raw.length - 1])).map(entry => entry.raw.join('/').replace(/_all\.csv$/i, '.csv').toLowerCase()));
  const pages = entries.filter(entry => {
    const name = entry.raw[entry.raw.length - 1];
    if (PAGE.test(name) || CSV.test(name)) return !(CSV.test(name) && !/_all\.csv$/i.test(name) && allCsv.has(entry.raw.join('/').toLowerCase()));
    skipped.push({ path: pathOf(entry), reason: 'unsupported' });
    return false;
  }).sort(compareEntries);

  const withChildren = new Set(entries.filter(entry => entry.raw.length > 1).map(entry => entry.raw[0]));
  const groups = new Map<string, Group>();
  const trayFor = (entry: Entry) => {
    const top = entry.raw.length > 1 ? entry.raw[0] : baseName(entry.raw[0]);
    const own = entry.raw.length > 1 || withChildren.has(top);
    const key = own ? `/${top}` : '';
    if (!groups.has(key)) groups.set(key, { id: `group-${options.newId()}`, name: own ? `${options.labels.notion} / ${stripNotionId(top)}` : options.labels.notion, type: 'group' });
    return groups.get(key)!;
  };

  const notes: Note[] = [];
  const noteBytes = new Map<string, number>();
  const counter = { embeds: 0 };
  let total = 0;
  for (const entry of pages) {
    options.signal?.throwIfAborted();
    // Past the memo or size limit the import cannot be saved; the preview reports the limit.
    if (planIsFull(notes.length, total)) break;
    const name = entry.raw[entry.raw.length - 1];
    try {
      const text = await readImportText(entry.file, budget);
      if (text === null) { skipped.push({ path: pathOf(entry), reason: 'tooLarge' }); continue; }
      let converted: Converted | null;
      if (CSV.test(name)) converted = convertCsv(text, options, counter);
      else if (/\.md$/i.test(name)) {
        const markdown = notionMarkdown(text);
        const result = obsidianMarkdownToHtml(markdown.body, options.labels);
        counter.embeds += result.embeds;
        converted = { title: markdown.title, html: result.html };
      } else converted = convertHtmlPage(text, options, counter);
      if (!converted) { skipped.push({ path: pathOf(entry), reason: 'tooLarge' }); continue; }
      const time = isoTime(entry.file.lastModified);
      const built = buildImportedNote({ title: converted.title ?? stripNotionId(baseName(name)), html: converted.html, group: trayFor(entry), createdAt: time, updatedAt: time, icon: converted.icon }, options);
      if (!built) { skipped.push({ path: pathOf(entry), reason: 'tooLarge' }); continue; }
      notes.push(built.note);
      noteBytes.set(built.note.id, built.bytes);
      total += built.bytes;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      skipped.push({ path: pathOf(entry), reason: 'invalid' });
    }
  }
  // The shared tray first, then one tray per page tree in name order, like the vault root and folders (specs/14).
  const trays = [...groups.entries()].sort(([a], [b]) => Number(Boolean(a)) - Number(Boolean(b))).map(([, group]) => group);
  return { vaultName: options.labels.notion, ...orderPlanNotes(trays, notes, options.listStyle), noteBytes, embeds: counter.embeds, skipped };
}
