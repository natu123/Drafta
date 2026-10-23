import { editorDocumentToHtml, editorHtmlToDocument } from './document-codec';
import { BACKUP_LIMITS, createWorkspaceBackup, parseWorkspaceBackup, type BackupSettings } from './workspace-backup';
import { CLOUD_LIMITS } from './cloud-limits';
import { expandArchives } from './import-archive';
import { ZIP_LIMITS, type ZipBudget } from './zip';
import type { Group, Note } from './types';

/**
 * Obsidian Vault import (specs/14_import.md). External Markdown is never passed to
 * plainMarkdownToRich: every text run is escaped here, and only http/https/mailto
 * links become anchors before the result is validated like a stored workspace.
 */

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|avif|heic)$/i;
// Raw files above this are skipped before conversion; the stored JSON limit is checked after.
export const IMPORT_RAW_FILE_BYTES = 2 * 1024 * 1024;
// Headroom below CLOUD_LIMITS so edits made during an import still fit in the same save.
// A new memo is two documents (summary and body, specs/17), so 200 memos stay below 480 writes.
export const IMPORT_BATCH_LIMITS = { notes: 200, bytes: 7000000 } as const;

// Rows × cells of the tables in one memo, below the stored bound (100000, workspace-backup's
// tableSlots). Larger tables keep their text as one paragraph per row.
export const TABLE_SLOTS = 90000;

export type EmbedLabels = { image: string; file: string };
export type ConvertedMarkdown = { html: string; embeds: number; tags: string[] };

export function safeLinkUrl(value: string): string | null {
  const url = value.trim();
  if (!url || /[\u0000- \u007f\\]/.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return url;
  } catch { return null; }
}

function decodeURIComponentSafe(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function emphasis(escaped: string): string {
  return escaped
    .replace(/==(.+?)==/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(?<![/*])\*(?![/*\s])([^*]+?)\*(?![/*])/g, '<em>$1</em>')
    .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>');
}

/**
 * Code spans, found by pairing backtick runs of the same length in one pass: a code span closes
 * with a run of its opening length, so ``a`b`` holds a backtick. (A regular expression search
 * for this was quadratic on long lines.)
 */
function holdCodeSpans(text: string, hold: (html: string) => string): string {
  const runs = Array.from(text.matchAll(/`+/g), match => ({ start: match.index, length: match[0].length }));
  const byLength = new Map<number, number[]>();
  runs.forEach((run, index) => {
    const same = byLength.get(run.length);
    if (same) same.push(index); else byLength.set(run.length, [index]);
  });
  const nextOf = new Map<number, number>();
  let out = '';
  let cursor = 0;
  for (let index = 0; index < runs.length;) {
    const open = runs[index];
    const same = byLength.get(open.length)!;
    let next = nextOf.get(open.length) ?? 0;
    while (next < same.length && same[next] <= index) next++;
    nextOf.set(open.length, next);
    if (next === same.length) { index++; continue; }
    const close = runs[same[next]];
    out += text.slice(cursor, open.start) + hold(`<code>${escapeHtml(text.slice(open.start + open.length, close.start).replace(/^ (.*) $/, '$1'))}</code>`);
    cursor = close.start + close.length;
    index = same[next] + 1;
  }
  return out + text.slice(cursor);
}

/**
 * Converts one line of inline Markdown. Tokens render before emphasis so URLs stay intact.
 * Lengths are bounded and brackets cannot repeat inside a label, so a long line stays linear.
 */
export function inlineToHtml(text: string, labels: EmbedLabels, counter: { embeds: number }): string {
  const tokens: string[] = [];
  const hold = (html: string) => `\u0000${tokens.push(html) - 1}\u0000`;
  const embed = (name: string, source = name) => {
    counter.embeds++;
    const target = name.split('|')[0].trim();
    return hold(escapeHtml(`[${IMAGE_EXTENSIONS.test(source.split('|')[0].trim()) ? labels.image : labels.file}: ${target}]`));
  };
  const source = holdCodeSpans(text.replace(/\u0000/g, ''), hold)
    // Backslash escapes (CommonMark): the character stays as text, as Drafta's own exports expect (specs/20).
    .replace(/\\([!-/:-@[-`{-~])/g, (_, char: string) => hold(escapeHtml(char)))
    .replace(/!\[\[([^[\]]{1,1000})\]\]/g, (_, name: string) => embed(name))
    .replace(/!\[([^[\]]{0,1000})\]\(([^()]{0,2048})\)/g, (_, alt: string, url: string) => {
      const name = decodeURIComponentSafe(url.trim().split('/').pop() || url);
      return embed(alt.trim() || name, name);
    })
    .replace(/\[\[([^[\]]{1,1000})\]\]/g, (_, target: string) => {
      const [page, alias] = target.split('|');
      return hold(escapeHtml((alias ?? page.replace(/#\^?.*$/, '')).trim() || page.trim()));
    })
    .replace(/\[([^[\]]{1,1000})\]\(((?:[^()\s]|\([^()\s]{0,256}\)){1,2048})(?:\s+"[^"\n]{0,500}")?\)/g, (_, label: string, url: string) => {
      const href = safeLinkUrl(url);
      return hold(href ? `<a href="${escapeHtml(href)}">${emphasis(escapeHtml(label))}</a>` : emphasis(escapeHtml(label)));
    })
    .replace(/<((?:https?:\/\/|mailto:)[^<>\s]{1,2048})>/g, (match, url: string) => {
      const href = safeLinkUrl(url);
      return href ? hold(`<a href="${escapeHtml(href)}">${escapeHtml(url)}</a>`) : match;
    });
  return emphasis(escapeHtml(source)).replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)]);
}

/** Removes leading YAML frontmatter and returns its tags. */
export function splitFrontmatter(markdown: string): { body: string; tags: string[] } {
  const match = /^---\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(markdown);
  if (!match) return { body: markdown, tags: [] };
  const tags: string[] = [];
  const lines = match[1].split('\n');
  for (let index = 0; index < lines.length; index++) {
    const field = /^(tags?)\s*:\s*(.*)$/i.exec(lines[index]);
    if (!field) continue;
    const inline = field[2].trim().replace(/^\[|\]$/g, '');
    if (inline) tags.push(...inline.split(/[,\s]+/));
    while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1])) tags.push(lines[++index].replace(/^\s*-\s+/, ''));
  }
  const clean = tags.map(tag => tag.trim().replace(/^["']|["']$/g, '').replace(/^#/, '')).filter(tag => /^[^\s#]+$/.test(tag));
  return { body: markdown.slice(match[0].length), tags: [...new Set(clean)] };
}

/** Block conversion mirrors plainMarkdownToRich's structures (flat lists, header-first tables). */
export function obsidianMarkdownToHtml(markdown: string, labels: EmbedLabels): ConvertedMarkdown {
  const normalized = markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
  const { body, tags } = splitFrontmatter(normalized);
  const counter = { embeds: 0 };
  const inline = (text: string) => inlineToHtml(text, labels, counter);
  const result: string[] = [];
  let list: 'ul' | 'ol' | 'task' | null = null;
  let table: string[][] | null = null;
  let quote: string[] | null = null;
  let code: { fence: string; language: string; lines: string[] } | null = null;

  const closeList = () => { if (list) result.push(list === 'ol' ? '</ol>' : '</ul>'); list = null; };
  let tableSlots = 0;
  const closeTable = () => {
    if (!table) return;
    const rows: string[][] = table;
    table = null;
    const width = rows[0].length;
    // Rows are padded only for a table within the stored bound; a larger one keeps its text.
    if (tableSlots + rows.length * rows.length * width > TABLE_SLOTS) {
      result.push(...rows.map(cells => `<p>${inline(cells.join(' | '))}</p>`));
      return;
    }
    tableSlots += rows.length * rows.length * width;
    result.push(`<table><tbody>${rows.map((cells, row) => `<tr>${Array.from({ length: width }, (_, column) => {
      const tag = row === 0 ? 'th' : 'td';
      return `<${tag}><p>${inline(cells[column] ?? '')}</p></${tag}>`;
    }).join('')}</tr>`).join('')}</tbody></table>`);
  };
  const closeQuote = () => {
    if (!quote) return;
    result.push(`<blockquote>${quote.map(line => `<p>${line}</p>`).join('')}</blockquote>`);
    quote = null;
  };
  const closeBlocks = () => { closeList(); closeTable(); closeQuote(); };
  const openList = (kind: 'ul' | 'ol' | 'task', start = 1) => {
    if (list === kind) return;
    closeBlocks();
    result.push(kind === 'task' ? '<ul data-type="taskList">' : kind === 'ol' ? `<ol start="${start}">` : '<ul>');
    list = kind;
  };
  const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());

  const lines = body.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    if (code) {
      if (trimmed === code.fence || (code.fence !== '$$' && trimmed.startsWith(code.fence[0]) && /^(`{3,}|~{3,})$/.test(trimmed) && trimmed.length >= code.fence.length)) {
        const language = /^[\w+-]{1,64}$/.test(code.language) ? ` class="language-${code.language}"` : '';
        result.push(`<pre><code${language}>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
        code = null;
      } else code.lines.push(line);
      continue;
    }
    const fence = /^(`{3,}|~{3,})\s*([^\s`]*)/.exec(trimmed);
    if (fence || trimmed === '$$') {
      closeBlocks();
      code = fence ? { fence: fence[1], language: fence[2], lines: [] } : { fence: '$$', language: 'latex', lines: [] };
      continue;
    }
    if (trimmed.startsWith('>')) {
      closeList(); closeTable();
      const text = trimmed.replace(/^>\s?/, '');
      const callout = /^\[!([\w-]+)\][+-]?\s*(.*)$/.exec(text);
      quote ??= [];
      if (callout) {
        const kind = callout[1].charAt(0).toUpperCase() + callout[1].slice(1).toLowerCase();
        quote.push(inline(callout[2] ? `${kind}: ${callout[2]}` : kind));
      } else quote.push(inline(text));
      continue;
    }
    closeQuote();
    if (/^\|.*\|$/.test(trimmed) || (table && trimmed.includes('|'))) {
      const row = cells(trimmed);
      if (!table) {
        const next = lines[index + 1]?.trim() ?? '';
        if (cells(next).every(cell => /^:?-+:?$/.test(cell)) && cells(next).length === row.length) {
          closeList();
          table = [row];
          index++;
          continue;
        }
      } else {
        table.push(row.slice(0, table[0].length));
        continue;
      }
    }
    closeTable();
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 3);
      result.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) { closeList(); result.push('<hr>'); continue; }
    const task = /^[-*+]\s+\[(.)\]\s?(.*)$/.exec(trimmed);
    if (task) {
      openList('task');
      const checked = task[1].toLowerCase() === 'x';
      result.push(`<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? ' checked' : ''}><span></span></label><div><p>${inline(task[2])}</p></div></li>`);
      continue;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (bullet) { openList('ul'); result.push(`<li><p>${inline(bullet[1])}</p></li>`); continue; }
    const ordered = /^(\d{1,9})[.)]\s+(.*)$/.exec(trimmed);
    if (ordered) {
      const value = Math.max(1, Number(ordered[1]));
      openList('ol', value);
      result.push(`<li value="${value}" style="--li-value: ${value}"><p>${inline(ordered[2])}</p></li>`);
      continue;
    }
    closeList();
    result.push(trimmed ? `<p>${inline(trimmed)}</p>` : '<p></p>');
  }
  if (code) {
    const open: { lines: string[] } = code;
    result.push(`<pre><code>${escapeHtml(open.lines.join('\n'))}</code></pre>`);
  }
  closeBlocks();
  // Drop trailing empty paragraphs left by the file's final newline.
  while (result.length && result[result.length - 1] === '<p></p>') result.pop();
  if (tags.length) result.push(`<p>${escapeHtml(tags.map(tag => `#${tag}`).join(' '))}</p>`);
  return { html: result.join(''), embeds: counter.embeds, tags };
}

/**
 * A file to import. `archive` names the ZIP an entry came from (its path is then inside the ZIP);
 * `blob` is the selected file itself, for ZIP reading; `stream` reads large files (ENEX) in pieces.
 */
export type ImportFile = { path: string; size: number; lastModified: number; read: () => Promise<string>; archive?: string; blob?: Blob; stream?: () => ReadableStream<Uint8Array> };
export type SkippedFile = { path: string; reason: 'tooLarge' | 'unsupported' | 'invalid' };
export type ImportPlan = { vaultName: string; groups: Group[]; notes: Note[]; noteBytes: Map<string, number>; embeds: number; skipped: SkippedFile[] };
export type PlanOptions = { dom: Document; labels: EmbedLabels & { vault: string }; newId: () => string; listStyle: BackupSettings['listStyle']; signal?: AbortSignal };

export const segmentsOf = (path: string) => path.replace(/\\/g, '/').split('/').filter(Boolean);
export const naturalOrder = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const PLAN_SETTINGS: BackupSettings = { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' };
// Text read in one import (specs/20): bounds the work of a large export without limiting memo count.
export const IMPORT_TOTAL_RAW_BYTES = 256 * 1024 * 1024;
/**
 * What one import may use, shared by all its files and formats (specs/20): `text` read for
 * conversion, ZIP entries and directory bytes across nested archives, bytes inflated from any
 * archive (ENEX inside a ZIP too), and compressed nested archives held in memory.
 */
export type ImportBudget = ZipBudget & { text: number; nested: number };
export const IMPORT_BUDGET: Readonly<ImportBudget> = {
  text: IMPORT_TOTAL_RAW_BYTES, entries: ZIP_LIMITS.entries, directoryBytes: ZIP_LIMITS.directoryBytes,
  inflated: 2 * 1024 * 1024 * 1024, nested: 256 * 1024 * 1024,
};
export const createImportBudget = (): ImportBudget => ({ ...IMPORT_BUDGET });
/** Past these the import cannot be saved, so planning stops and the preview shows the limit. */
export const planIsFull = (notes: number, bytes: number) => notes > BACKUP_LIMITS.notes || bytes > BACKUP_LIMITS.bytes;
export const displayPath = (file: Pick<ImportFile, 'path' | 'archive'>) => file.archive ? `${file.archive}/${file.path}` : file.path;
export const isoTime = (time: number) => new Date(Number.isFinite(time) && time > 0 && time < 253402300800000 ? time : Date.now()).toISOString();

/** Reads one file within the per-file and per-import limits; null when it is too large. */
export async function readImportText(file: ImportFile, budget: ImportBudget): Promise<string | null> {
  if (file.size > IMPORT_RAW_FILE_BYTES || file.size > budget.text) return null;
  budget.text -= file.size;
  const text = await file.read();
  return text.length > IMPORT_RAW_FILE_BYTES ? null : text;
}

export type ImportedNote = { title: string; html: string; group: Group; createdAt: string; updatedAt: string; icon?: string };

/**
 * One converted memo, checked with the same validator and byte measure as a cloud save.
 * Returns null when it is over the per-memo limit; throws when it is not a valid document.
 */
export function buildImportedNote(input: ImportedNote, options: Pick<PlanOptions, 'dom' | 'newId'>): { note: Note; bytes: number } | null {
  const id = `note-${options.newId()}`;
  const icon = input.icon ?? '📝';
  const document = editorHtmlToDocument(`<h1>${escapeHtml(input.title)}</h1>${input.html}`, options.dom);
  const stored = { id, icon, group: input.group.id, stars: 0 as const, createdAt: input.createdAt, updatedAt: input.updatedAt, document };
  parseWorkspaceBackup(JSON.stringify({ format: 'drafta-workspace', version: 1, exportedAt: input.updatedAt, groups: [input.group], notes: [stored], settings: PLAN_SETTINGS }));
  const bytes = new TextEncoder().encode(JSON.stringify(stored)).byteLength;
  if (bytes > CLOUD_LIMITS.documentBytes) return null;
  // The memo keeps the HTML of the validated document, not the converter's output, so nothing
  // unchecked reaches the editor or innerHTML (as workspace-state does for stored memos).
  // Serialized in the template's inert document: nothing is created in the page's document.
  const template = options.dom.createElement('template');
  template.innerHTML = editorDocumentToHtml(document, template.content.ownerDocument);
  template.content.firstElementChild?.remove();
  const content = template.innerHTML;
  template.content.querySelectorAll('p,div,li,h1,h2,h3,pre').forEach(element => element.after(' '));
  return { note: { id, title: input.title, icon, content, plainTextContent: (template.content.textContent ?? '').replace(/\s+/g, ' ').trim(),
    group: input.group.id, stars: 0, createdAt: input.createdAt, updatedAt: input.updatedAt }, bytes };
}

/**
 * Within each tray, newer memos sit where the list style adds new memos (specs/14). The sort is
 * stable, so equal times keep the order given. Trays without memos are left out.
 */
export function orderPlanNotes(groups: Group[], notes: Note[], listStyle: BackupSettings['listStyle']): { groups: Group[]; notes: Note[] } {
  const direction = listStyle === 'bottom' ? 1 : -1;
  const ordered = groups.flatMap(group => notes.filter(note => note.group === group.id)
    .sort((a, b) => direction * (Date.parse(a.updatedAt) - Date.parse(b.updatedAt))));
  const used = new Set(ordered.map(note => note.group));
  return { groups: groups.filter(group => used.has(group.id)), notes: ordered };
}

/**
 * Reads and converts files locally. Nothing is saved; the result is a preview candidate.
 * Folder selection gives "Vault/folder/file.md"; loose file selection gives "file.md".
 */
export async function planObsidianImport(files: ImportFile[], options: PlanOptions): Promise<ImportPlan> {
  const skipped: SkippedFile[] = [];
  const budget = createImportBudget();
  const entries = vaultPaths(await expandArchives(files, skipped, budget, options.signal)).map(file => ({ file, segments: segmentsOf(file.path) }))
    // Obsidian settings, trash and other hidden folders are not user notes.
    .filter(entry => entry.segments.length && !entry.segments.some(segment => segment.startsWith('.')))
    .sort((a, b) => naturalOrder(a.segments.join('/'), b.segments.join('/')));
  const fromFolder = entries.some(entry => entry.segments.length > 1);
  const vaultName = fromFolder ? entries.find(entry => entry.segments.length > 1)!.segments[0] : options.labels.vault;
  const groups = new Map<string, Group>();
  const notes: Note[] = [];
  const noteBytes = new Map<string, number>();
  let embeds = 0;
  let total = 0;
  const trayFor = (segments: string[]) => {
    const inner = fromFolder ? segments.slice(1) : segments;
    const name = inner.length > 1 ? `${vaultName} / ${inner[0]}` : vaultName;
    if (!groups.has(name)) groups.set(name, { id: `group-${options.newId()}`, name, type: 'group' });
    return groups.get(name)!;
  };
  // Root files first, then folders, so the Vault tray leads like Obsidian's file tree.
  entries.sort((a, b) => Number((fromFolder ? a.segments.length - 1 : a.segments.length) > 1) - Number((fromFolder ? b.segments.length - 1 : b.segments.length) > 1));
  for (const { file, segments } of entries) {
    const path = segments.join('/');
    const name = segments[segments.length - 1];
    options.signal?.throwIfAborted();
    if (planIsFull(notes.length, total)) break;
    if (!/\.md$/i.test(name)) { skipped.push({ path, reason: 'unsupported' }); continue; }
    try {
      const text = await readImportText(file, budget);
      if (text === null) { skipped.push({ path, reason: 'tooLarge' }); continue; }
      const converted = obsidianMarkdownToHtml(text, options.labels);
      const time = isoTime(file.lastModified);
      const built = buildImportedNote({ title: name.replace(/\.md$/i, ''), html: converted.html, group: trayFor(segments), createdAt: time, updatedAt: time }, options);
      if (!built) { skipped.push({ path, reason: 'tooLarge' }); continue; }
      notes.push(built.note);
      noteBytes.set(built.note.id, built.bytes);
      total += built.bytes;
      embeds += converted.embeds;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      skipped.push({ path, reason: 'invalid' });
    }
  }
  // Equal times keep the natural file order from above.
  return { vaultName, ...orderPlanNotes([...groups.values()], notes, options.listStyle), noteBytes, embeds, skipped };
}

/**
 * ZIP entries as if the vault folder had been chosen (specs/20): a ZIP of the vault folder keeps
 * its folder name, and a ZIP of loose files takes the ZIP's own name as the vault name.
 */
function vaultPaths(files: ImportFile[]): ImportFile[] {
  const tops = new Map<string, Set<string>>();
  for (const file of files) {
    if (!file.archive) continue;
    const segments = segmentsOf(file.path);
    tops.set(file.archive, (tops.get(file.archive) ?? new Set<string>()).add(segments.length > 1 ? segments[0] : ''));
  }
  return files.map(file => {
    const found = file.archive ? tops.get(file.archive) : undefined;
    if (!found || (found.size === 1 && !found.has(''))) return file;
    const base = segmentsOf(file.archive!).pop()!.replace(/\.zip$/i, '') || 'Obsidian';
    return { ...file, path: `${base}/${file.path}` };
  });
}

export type ImportLimitError = 'notes' | 'groups' | 'size';

/** Checks the merged workspace with the same validator as a save, before anything is written. */
export function checkImportLimits(existing: { notes: Note[]; groups: Group[]; settings: BackupSettings }, plan: ImportPlan, dom: Document): ImportLimitError | null {
  if (existing.notes.length + plan.notes.length > BACKUP_LIMITS.notes) return 'notes';
  if (existing.groups.length + plan.groups.length > BACKUP_LIMITS.groups) return 'groups';
  try {
    createWorkspaceBackup({ notes: [...existing.notes, ...plan.notes], groups: [...existing.groups, ...plan.groups], settings: existing.settings }, dom);
    return null;
  } catch { return 'size'; }
}

/** Splits notes so each save stays under the per-save write and byte limits. */
export function importBatches(plan: ImportPlan, limits: { notes: number; bytes: number } = IMPORT_BATCH_LIMITS): Note[][] {
  const batches: Note[][] = [];
  let current: Note[] = [];
  let bytes = 0;
  for (const note of plan.notes) {
    const size = plan.noteBytes.get(note.id) ?? 0;
    if (current.length && (current.length >= limits.notes || bytes + size > limits.bytes)) { batches.push(current); current = []; bytes = 0; }
    current.push(note);
    bytes += size;
  }
  if (current.length) batches.push(current);
  return batches;
}
