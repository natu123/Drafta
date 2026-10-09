import { editorHtmlToDocument } from './document-codec';
import { BACKUP_LIMITS, createWorkspaceBackup, parseWorkspaceBackup, type BackupSettings } from './workspace-backup';
import { CLOUD_LIMITS } from './cloud-workspace';
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
export const IMPORT_BATCH_LIMITS = { notes: 350, bytes: 7000000 } as const;

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

/** Converts one line of inline Markdown. Tokens render before emphasis so URLs stay intact. */
export function inlineToHtml(text: string, labels: EmbedLabels, counter: { embeds: number }): string {
  const tokens: string[] = [];
  const hold = (html: string) => `\u0000${tokens.push(html) - 1}\u0000`;
  const embed = (name: string, source = name) => {
    counter.embeds++;
    const target = name.split('|')[0].trim();
    return hold(escapeHtml(`[${IMAGE_EXTENSIONS.test(source.split('|')[0].trim()) ? labels.image : labels.file}: ${target}]`));
  };
  const source = text.replace(/\u0000/g, '')
    .replace(/`([^`]+)`/g, (_, code: string) => hold(`<code>${escapeHtml(code)}</code>`))
    .replace(/!\[\[([^\]]+)\]\]/g, (_, name: string) => embed(name))
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_, alt: string, url: string) => {
      const name = decodeURIComponentSafe(url.trim().split('/').pop() || url);
      return embed(alt.trim() || name, name);
    })
    .replace(/\[\[([^\]]+)\]\]/g, (_, target: string) => {
      const [page, alias] = target.split('|');
      return hold(escapeHtml((alias ?? page.replace(/#\^?.*$/, '')).trim() || page.trim()));
    })
    .replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"]*")?\)/g, (_, label: string, url: string) => {
      const href = safeLinkUrl(url);
      return hold(href ? `<a href="${escapeHtml(href)}">${emphasis(escapeHtml(label))}</a>` : emphasis(escapeHtml(label)));
    })
    .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, (match, url: string) => {
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
  const closeTable = () => {
    if (!table) return;
    const [header, ...rows] = table;
    result.push(`<table><tbody>${[header, ...rows].map((cells, row) => `<tr>${cells.map(cell => {
      const tag = row === 0 ? 'th' : 'td';
      return `<${tag}><p>${inline(cell)}</p></${tag}>`;
    }).join('')}</tr>`).join('')}</tbody></table>`);
    table = null;
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
        table.push(row.slice(0, table[0].length).concat(Array(Math.max(0, table[0].length - row.length)).fill('')));
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

export type ImportFile = { path: string; size: number; lastModified: number; read: () => Promise<string> };
export type SkippedFile = { path: string; reason: 'tooLarge' | 'unsupported' | 'invalid' };
export type ImportPlan = { vaultName: string; groups: Group[]; notes: Note[]; noteBytes: Map<string, number>; embeds: number; skipped: SkippedFile[] };
export type PlanOptions = { dom: Document; labels: EmbedLabels & { vault: string }; newId: () => string };

const segmentsOf = (path: string) => path.replace(/\\/g, '/').split('/').filter(Boolean);
const naturalOrder = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const PLAN_SETTINGS: BackupSettings = { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' };

/**
 * Reads and converts files locally. Nothing is saved; the result is a preview candidate.
 * Folder selection gives "Vault/folder/file.md"; loose file selection gives "file.md".
 */
export async function planObsidianImport(files: ImportFile[], options: PlanOptions): Promise<ImportPlan> {
  const entries = files.map(file => ({ file, segments: segmentsOf(file.path) }))
    // Obsidian settings, trash and other hidden folders are not user notes.
    .filter(entry => entry.segments.length && !entry.segments.some(segment => segment.startsWith('.')))
    .sort((a, b) => naturalOrder(a.segments.join('/'), b.segments.join('/')));
  const fromFolder = entries.some(entry => entry.segments.length > 1);
  const vaultName = fromFolder ? entries.find(entry => entry.segments.length > 1)!.segments[0] : options.labels.vault;
  const skipped: SkippedFile[] = [];
  const groups = new Map<string, Group>();
  const notes: Note[] = [];
  const noteBytes = new Map<string, number>();
  let embeds = 0;
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
    if (!/\.md$/i.test(name)) { skipped.push({ path, reason: 'unsupported' }); continue; }
    if (file.size > IMPORT_RAW_FILE_BYTES) { skipped.push({ path, reason: 'tooLarge' }); continue; }
    try {
      const converted = obsidianMarkdownToHtml(await file.read(), options.labels);
      const group = trayFor(segments);
      const time = new Date(Number.isFinite(file.lastModified) && file.lastModified > 0 ? file.lastModified : Date.now()).toISOString();
      const title = name.replace(/\.md$/i, '');
      const id = `note-${options.newId()}`;
      const document = editorHtmlToDocument(`<h1>${escapeHtml(title)}</h1>${converted.html}`, options.dom);
      const stored = { id, icon: '📝', group: group.id, stars: 0 as const, createdAt: time, updatedAt: time, document };
      // The same validator and byte measure as a cloud save.
      parseWorkspaceBackup(JSON.stringify({ format: 'drafta-workspace', version: 1, exportedAt: time, groups: [group], notes: [stored], settings: PLAN_SETTINGS }));
      const bytes = new TextEncoder().encode(JSON.stringify(stored)).byteLength;
      if (bytes > CLOUD_LIMITS.documentBytes) { skipped.push({ path, reason: 'tooLarge' }); continue; }
      const template = options.dom.createElement('template');
      template.innerHTML = converted.html;
      template.content.querySelectorAll('p,div,li,h1,h2,h3,pre').forEach(element => element.after(' '));
      notes.push({ id, title, icon: '📝', content: converted.html, plainTextContent: (template.content.textContent ?? '').replace(/\s+/g, ' ').trim(),
        group: group.id, stars: 0, createdAt: time, updatedAt: time });
      noteBytes.set(id, bytes);
      embeds += converted.embeds;
    } catch { skipped.push({ path, reason: 'invalid' }); }
  }
  const used = new Set(notes.map(note => note.group));
  return { vaultName, groups: [...groups.values()].filter(group => used.has(group.id)), notes, noteBytes, embeds, skipped };
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
