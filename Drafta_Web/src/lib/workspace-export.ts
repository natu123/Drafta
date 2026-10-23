import type { JSONContent } from '@tiptap/core';
import { editorHtmlToDocument } from './document-codec';
import { isLazyNote, sourceOf } from './note-source';
import { trustDocument } from './workspace-backup';
import { createZip, type ZipInput } from './zip';
import type { Group, Note } from './types';

/**
 * Workspace export in other apps' formats (specs/20): an Obsidian vault and a Notion import, both
 * Markdown in a ZIP, and Evernote ENEX (one file per tray, in a ZIP). Built on this device from the
 * stored documents; nothing is sent anywhere.
 */

export type ExportFormat = 'obsidian' | 'notion' | 'evernote';
export type ExportMemo = { title: string; createdAt: string; updatedAt: string; blocks: JSONContent[] };
export type ExportTray = { name: string; memos: ExportMemo[] };
export type ExportLabels = { untitledMemo: string; untitledTray: string };

const plainTitle = (title: string) => title.replace(/\{color:#[0-9a-fA-F]{3,6}\}(.*?)\{\/color\}/g, '$1');

/** The body of a memo without its title node: the stored document of an unopened memo, else its editor HTML. */
function bodyOf(note: Note, dom: Document): JSONContent[] {
  if (isLazyNote(note)) {
    const document = sourceOf(note)?.note.document;
    if (!document) throw new Error('Memo body is not loaded');
    // A body from the device cache may not be checked yet (0.8.6); a bad one stops the export.
    trustDocument(document, `notes.${note.id}.document`);
    return document.document.content?.slice(1) ?? [];
  }
  return editorHtmlToDocument(`<h1></h1>${note.content}`, dom).document.content?.slice(1) ?? [];
}

/** Trays and memos to export: everything not deleted, in the workspace order, without separators. */
export function collectExport(source: { notes: Note[]; groups: Group[] }, dom: Document): ExportTray[] {
  return source.groups.filter(group => !group.isDeleted && group.type !== 'separator').map(group => ({
    name: group.name,
    memos: source.notes.filter(note => note.group === group.id && !note.isDeleted && note.type !== 'separator')
      .map(note => ({ title: plainTitle(note.title), createdAt: note.createdAt, updatedAt: note.updatedAt, blocks: bodyOf(note, dom) })),
  }));
}

// ---------- Markdown (Obsidian, Notion) ----------

type Mark = { key: string; open: string; close: string };

const MARKDOWN_SPECIAL = /[\\`*_[\]<>|~$#]/g;
export function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_SPECIAL, '\\$&').replace(/==/g, '\\=\\=').replace(/%%/g, '\\%\\%').replace(/&(?=#?[a-zA-Z0-9]+;)/g, '\\&');
}

const longestRun = (text: string, run: RegExp) => (text.match(run) ?? []).reduce((longest, item) => Math.max(longest, item.length), 0);

function codeSpan(text: string): string {
  const longest = longestRun(text, /`+/g);
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

const linkTarget = (href: string) => href.replace(/[ ()<>]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);

function marksOf(node: JSONContent): Mark[] {
  const marks: Mark[] = [];
  const has = (type: string) => node.marks?.find(mark => mark.type === type);
  const link = has('link');
  const href = typeof link?.attrs?.href === 'string' ? link.attrs.href : '';
  if (href) marks.push({ key: `link:${href}`, open: '[', close: `](${linkTarget(href)})` });
  if (has('bold')) marks.push({ key: 'bold', open: '**', close: '**' });
  if (has('italic')) marks.push({ key: 'italic', open: '*', close: '*' });
  if (has('strike')) marks.push({ key: 'strike', open: '~~', close: '~~' });
  return marks;
}

/** Inline content; hard breaks come out as "\n" for the caller to place. Underline and colors are dropped. */
export function inlineMarkdown(nodes: JSONContent[] | undefined): string {
  let out = '';
  const stack: Mark[] = [];
  const closeTo = (depth: number) => {
    if (stack.length <= depth) return;
    // Delimiters cannot sit next to whitespace on their inner side, so spaces move outside.
    const trailing = /[ \t]*$/.exec(out)![0];
    out = out.slice(0, out.length - trailing.length);
    while (stack.length > depth) out += stack.pop()!.close;
    out += trailing;
  };
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') { out += '\n'; continue; }
    if (node.type !== 'text' || !node.text) continue;
    let text = node.text;
    const wanted = text.trim() ? marksOf(node) : stack.slice();
    let keep = 0;
    while (keep < stack.length && keep < wanted.length && stack[keep].key === wanted[keep].key) keep++;
    closeTo(keep);
    if (wanted.length > keep) {
      const leading = /^[ \t]*/.exec(text)![0];
      out += leading;
      text = text.slice(leading.length);
      for (const mark of wanted.slice(keep)) { out += mark.open; stack.push(mark); }
    }
    out += node.marks?.some(mark => mark.type === 'code') ? codeSpan(text) : escapeMarkdown(text);
  }
  closeTo(0);
  return out;
}

// A paragraph line must not start a list, quote, heading or code block by accident, and a line of
// only "-" or "=" must not turn the line before it into a heading (or be read as a rule or frontmatter).
function guardLine(line: string): string {
  return line.replace(/^[ \t]+/, spaces => '\u00a0'.repeat(spaces.length)).replace(/^([-+])(?=\s|$)/, '\\$1').replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
    .replace(/^([-=])(?=[-= \t]*$)/, '\\$1');
}

function textOf(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(textOf).join('');
}

/** Lines of a block sequence, blocks separated by one empty line. */
export function blocksToMarkdown(blocks: JSONContent[] | undefined): string[] {
  const lines: string[] = [];
  for (const block of blocks ?? []) {
    const rendered = blockToMarkdown(block);
    if (!rendered.length) continue;
    if (lines.length) lines.push('');
    lines.push(...rendered);
  }
  return lines;
}

const indent = (lines: string[], first: string, rest: string) => lines.map((line, index) => index === 0 ? first + line : line ? rest + line : line);

function listItems(block: JSONContent, marker: (item: JSONContent, index: number) => string): string[] {
  return (block.content ?? []).flatMap((item, index) => {
    const head = marker(item, index);
    const body = blocksToMarkdown(item.content);
    return indent(body.length ? body : [''], head, ' '.repeat(Math.min(head.length, 4)));
  });
}

function tableToMarkdown(block: JSONContent): string[] {
  const rows = (block.content ?? []).map(row => (row.content ?? []).flatMap(cell => {
    // Text already has its pipes escaped; code spans do not, and a table cell needs it there too.
    const text = blocksToMarkdown(cell.content).filter(line => line !== '').join('<br>').replace(/(?<!\\)\|/g, '\\|');
    const span = Math.max(1, Number(cell.attrs?.colspan) || 1);
    return [text || ' ', ...Array<string>(span - 1).fill(' ')];
  }));
  const width = Math.max(1, ...rows.map(row => row.length));
  if (!rows.length) return [];
  const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, index) => cells[index] ?? ' ').join(' | ')} |`;
  return [line(rows[0]), line(Array<string>(width).fill('---')), ...rows.slice(1).map(line)];
}

function blockToMarkdown(block: JSONContent): string[] {
  switch (block.type) {
    case 'paragraph': {
      const text = inlineMarkdown(block.content);
      return text.trim() ? text.split('\n').map(guardLine) : [];
    }
    case 'heading': {
      const text = inlineMarkdown(block.content).replace(/\n/g, ' ').trim();
      return text ? [`${'#'.repeat(Math.min(Math.max(Number(block.attrs?.level) || 1, 1), 3))} ${text}`] : [];
    }
    case 'blockquote': return blocksToMarkdown(block.content).map(line => line ? `> ${line}` : '>');
    case 'bulletList': return listItems(block, () => '- ');
    case 'taskList': return listItems(block, item => item.attrs?.checked ? '- [x] ' : '- [ ] ');
    case 'orderedList': {
      const start = Number(block.attrs?.startFrom ?? block.attrs?.start) || 1;
      return listItems(block, (item, index) => `${Number(item.attrs?.value) || start + index}. `);
    }
    case 'codeBlock': {
      const text = textOf(block);
      const longest = longestRun(text, /`{3,}/g);
      const fence = '`'.repeat(Math.max(3, longest + 1));
      const language = typeof block.attrs?.language === 'string' && /^[\w+-]+$/.test(block.attrs.language) && block.attrs.language !== 'plaintext' ? block.attrs.language : '';
      return [`${fence}${language}`, ...text.split('\n'), fence];
    }
    // Not "---": at the top of a file that starts YAML frontmatter, which Obsidian (and Drafta) would hide.
    case 'horizontalRule': return ['***'];
    case 'table': return tableToMarkdown(block);
    default: {
      const text = escapeMarkdown(textOf(block)).trim();
      return text ? text.split('\n').map(guardLine) : [];
    }
  }
}

// ---------- ENML (Evernote) ----------

// Characters XML 1.0 does not allow, and lone surrogates.
const xmlText = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '');
const escapeXml = (text: string) => xmlText(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SAFE_COLOR = /^(#[0-9a-f]{3}(?:[0-9a-f]{3})?|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;

function inlineEnml(nodes: JSONContent[] | undefined): string {
  return (nodes ?? []).map(node => {
    if (node.type === 'hardBreak') return '<br/>';
    if (node.type !== 'text' || !node.text) return '';
    let html = escapeXml(node.text);
    for (const mark of [...(node.marks ?? [])].reverse()) {
      if (mark.type === 'code') html = `<code>${html}</code>`;
      else if (mark.type === 'strike') html = `<s>${html}</s>`;
      else if (mark.type === 'underline') html = `<u>${html}</u>`;
      else if (mark.type === 'italic') html = `<i>${html}</i>`;
      else if (mark.type === 'bold') html = `<b>${html}</b>`;
      else if (mark.type === 'textStyle' && typeof mark.attrs?.color === 'string' && SAFE_COLOR.test(mark.attrs.color)) html = `<span style="color:${mark.attrs.color}">${html}</span>`;
      else if (mark.type === 'link' && typeof mark.attrs?.href === 'string' && /^(https?|mailto|tel):/i.test(mark.attrs.href)) html = `<a href="${escapeXml(mark.attrs.href)}">${html}</a>`;
    }
    return html;
  }).join('');
}

export function blocksToEnml(blocks: JSONContent[] | undefined): string {
  return (blocks ?? []).map(block => {
    switch (block.type) {
      case 'paragraph': return `<div>${inlineEnml(block.content) || '<br/>'}</div>`;
      case 'heading': {
        const level = Math.min(Math.max(Number(block.attrs?.level) || 1, 1), 3);
        return `<h${level}>${inlineEnml(block.content)}</h${level}>`;
      }
      case 'blockquote': return `<blockquote>${blocksToEnml(block.content)}</blockquote>`;
      case 'bulletList': return `<ul>${(block.content ?? []).map(item => `<li>${blocksToEnml(item.content)}</li>`).join('')}</ul>`;
      case 'orderedList': {
        const start = Number(block.attrs?.startFrom ?? block.attrs?.start) || 1;
        return `<ol${start > 1 ? ` start="${start}"` : ''}>${(block.content ?? []).map(item => `<li>${blocksToEnml(item.content)}</li>`).join('')}</ol>`;
      }
      // Evernote's own to-do element works in every Evernote version.
      case 'taskList': return (block.content ?? []).map(item => {
        const [first, ...rest] = item.content ?? [];
        return `<div><en-todo checked="${item.attrs?.checked ? 'true' : 'false'}"/>${first?.type === 'paragraph' ? inlineEnml(first.content) : ''}</div>${blocksToEnml(first?.type === 'paragraph' ? rest : item.content)}`;
      }).join('');
      case 'codeBlock': return `<pre>${escapeXml(textOf(block))}</pre>`;
      case 'horizontalRule': return '<hr/>';
      case 'table': return `<table><tbody>${(block.content ?? []).map(row => `<tr>${(row.content ?? []).map(cell => {
        const tag = cell.type === 'tableHeader' ? 'th' : 'td';
        const colspan = Number(cell.attrs?.colspan) > 1 ? ` colspan="${Number(cell.attrs?.colspan)}"` : '';
        const rowspan = Number(cell.attrs?.rowspan) > 1 ? ` rowspan="${Number(cell.attrs?.rowspan)}"` : '';
        return `<${tag}${colspan}${rowspan}>${blocksToEnml(cell.content)}</${tag}>`;
      }).join('')}</tr>`).join('')}</tbody></table>`;
      default: return `<div>${escapeXml(textOf(block))}</div>`;
    }
  }).join('');
}

const enexTime = (iso: string) => {
  const time = new Date(Date.parse(iso) || 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${time.getUTCFullYear()}${pad(time.getUTCMonth() + 1)}${pad(time.getUTCDate())}T${pad(time.getUTCHours())}${pad(time.getUTCMinutes())}${pad(time.getUTCSeconds())}Z`;
};
const cdata = (text: string) => `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

/** One notebook as ENEX (evernote-export4.dtd). Titles are one line of at most 255 characters. */
export function trayToEnex(memos: ExportMemo[], labels: ExportLabels, exportedAt: string): string {
  const notes = memos.map(memo => {
    const title = Array.from(xmlText(memo.title).replace(/\s+/g, ' ').trim()).slice(0, 255).join('').trim() || labels.untitledMemo;
    const content = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">\n<en-note>${blocksToEnml(memo.blocks)}</en-note>`;
    return `<note><title>${escapeXml(title)}</title><content>${cdata(content)}</content><created>${enexTime(memo.createdAt)}</created><updated>${enexTime(memo.updatedAt)}</updated></note>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">\n<en-export export-date="${enexTime(exportedAt)}" application="Drafta">\n${notes.join('\n')}\n</en-export>\n`;
}

// ---------- Files ----------

// Windows device names, reserved with any extension too (nul.txt), including the superscript digits.
const RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³]|conin\$|conout\$)$/i;
// Short enough that "Drafta/tray/memo 2.md" stays far below Windows' 260-character path limit
// after extraction into a folder such as Downloads.
export const NAME_LIMITS = { folder: 40, file: 80 } as const;

/** At most `max` UTF-16 units (Windows counts paths in them), without splitting a character. */
function truncate(text: string, max: number): string {
  let result = '';
  for (const char of text) {
    if (result.length + char.length > max) break;
    result += char;
  }
  return result;
}

/** A file or folder name that works on Windows, macOS, Linux, Obsidian links and Notion. */
export function safeFileName(name: string, fallback: string, max: number = NAME_LIMITS.file): string {
  const clean = (text: string) => truncate(text.replace(/[\\/:*?"<>|#^[\]\u0000-\u001f\u007f]/g, '_').replace(/\s+/g, ' ').trim()
    // A leading dot hides the file (Obsidian and the importers skip hidden files).
    .replace(/^[. ]+/, ''), max).replace(/[. ]+$/, '');
  const value = clean(name) || clean(fallback) || '_';
  const dot = value.indexOf('.');
  const base = (dot < 0 ? value : value.slice(0, dot)).trimEnd();
  return RESERVED.test(base) ? `${base}_${value.slice(base.length)}` : value;
}

/** Names unique within one folder, ignoring case: "Name", "Name 2", "Name 3". */
function uniqueNames() {
  const used = new Set<string>();
  return (name: string, extension = '') => {
    let candidate = name;
    for (let count = 2; used.has(`${candidate}${extension}`.toLowerCase()); count++) candidate = `${name} ${count}`;
    used.add(`${candidate}${extension}`.toLowerCase());
    return `${candidate}${extension}`;
  };
}

const memoTime = (memo: ExportMemo) => Date.parse(memo.updatedAt) || Date.now();

/** Builds the export file. Empty trays are left out (a ZIP holds files, and ENEX needs a note). */
export async function exportWorkspace(format: ExportFormat, trays: ExportTray[], labels: ExportLabels, now = new Date()): Promise<{ blob: Blob; fileName: string; memos: number }> {
  const files: ZipInput[] = [];
  const folders = uniqueNames();
  let memos = 0;
  for (const tray of trays.filter(item => item.memos.length)) {
    memos += tray.memos.length;
    if (format === 'evernote') {
      files.push({ path: folders(safeFileName(tray.name, labels.untitledTray), '.enex'), data: trayToEnex(tray.memos, labels, now.toISOString()),
        lastModified: tray.memos.reduce((latest, memo) => Math.max(latest, memoTime(memo)), 0) });
      continue;
    }
    const folder = folders(safeFileName(tray.name, labels.untitledTray, NAME_LIMITS.folder));
    const names = uniqueNames();
    for (const memo of tray.memos) {
      const body = blocksToMarkdown(memo.blocks);
      // Notion takes a page title from a leading "# " line, as in its own export; Obsidian shows the file name.
      const lines = format === 'notion' ? [`# ${escapeMarkdown(memo.title.replace(/\s+/g, ' ').trim() || labels.untitledMemo)}`, ...(body.length ? ['', ...body] : [])] : body;
      files.push({ path: `Drafta/${folder}/${names(safeFileName(memo.title, labels.untitledMemo), '.md')}`, data: `${lines.join('\n')}\n`, lastModified: memoTime(memo) });
    }
  }
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { blob: await createZip(files), fileName: `Drafta-${format}-${date}.zip`, memos };
}
