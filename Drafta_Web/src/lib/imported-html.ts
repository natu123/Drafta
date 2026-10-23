import { safeLinkUrl, type EmbedLabels } from './obsidian-import';

/**
 * Rewrites untrusted HTML (Notion's HTML export, Evernote's ENML) into the small set of elements
 * Drafta stores (specs/20). Nothing from the input is copied through: every element is rebuilt
 * from an allow list, text is escaped, and links keep only http/https/mailto URLs. The result still
 * goes through editorHtmlToDocument and the backup validation like any other import.
 * Parse the input with a template element: its content is inert (no scripts, no image loads).
 */

export type HtmlImportLabels = EmbedLabels & { encrypted: string };
export type ImportedTask = { title: string; done: boolean };
export type HtmlImportContext = {
  labels: HtmlImportLabels;
  counter: { embeds: number };
  /** Evernote 10 tasks by task group id, placed where the group's marker stands. */
  taskGroups?: Map<string, ImportedTask[]>;
};

// Deeper input is kept as text only, well inside the stored document depth (BACKUP_LIMITS.depth).
const MAX_DEPTH = 48;
const MAX_LIST_DEPTH = 6;
// Rows × cells per memo (workspace-backup's tableSlots bound is 100000), with headroom.
const TABLE_SLOTS = 90000;
const CHECKED = '\u0001x\u0001';
const UNCHECKED = '\u0001o\u0001';

const BLOCK = new Set(['address', 'article', 'aside', 'blockquote', 'body', 'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir', 'div',
  'dl', 'dt', 'en-note', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'html', 'legend',
  'li', 'listing', 'main', 'menu', 'nav', 'ol', 'p', 'plaintext', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'xmp']);
const DROP = new Set(['applet', 'base', 'button', 'canvas', 'datalist', 'frame', 'frameset', 'head', 'link', 'map', 'meta', 'meter', 'noembed', 'noframes',
  'noscript', 'option', 'optgroup', 'output', 'param', 'progress', 'script', 'select', 'source', 'style', 'svg', 'template', 'textarea', 'title', 'track']);
const MEDIA = new Set(['audio', 'embed', 'iframe', 'object', 'video']);

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Control characters other than tab and line breaks never reach a document (and \u0001 marks to-dos here).
const clean = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
const collapse = (value: string) => clean(value).replace(/[\t\n\f\r ]+/g, ' ');
const tagOf = (node: Node) => node.nodeType === 1 ? (node as Element).localName.toLowerCase() : '';
const styleOf = (element: Element) => (element.getAttribute('style') ?? '').toLowerCase();
const hasClass = (element: Element, name: string) => (element.getAttribute('class') ?? '').split(/\s+/).includes(name);
const fileName = (value: string) => {
  const last = value.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
  try { return decodeURIComponent(last); } catch { return last; }
};

/** Text with line breaks for code: block children and <br> end lines. */
function linesOf(node: Node): string {
  let text = '';
  const walk = (current: Node, depth: number) => {
    for (const child of Array.from(current.childNodes)) {
      if (child.nodeType === 3) text += child.nodeValue ?? '';
      else if (child.nodeType !== 1 || DROP.has(tagOf(child))) continue;
      else if (tagOf(child) === 'br') text += '\n';
      else if (depth > MAX_DEPTH) text += child.textContent ?? '';
      else {
        const block = BLOCK.has(tagOf(child));
        if (block && text && !text.endsWith('\n')) text += '\n';
        walk(child, depth + 1);
        if (block && !text.endsWith('\n')) text += '\n';
      }
    }
  };
  walk(node, 0);
  return clean(text).replace(/\n$/, '');
}

const codeBlock = (text: string, language?: string | null) => {
  const name = (language ?? '').toLowerCase().replace(/\s+/g, '');
  return `<pre><code${/^[\w+-]{1,64}$/.test(name) ? ` class="language-${name}"` : ''}>${escapeHtml(text)}</code></pre>`;
};

type Segment = { kind: 'block'; html: string } | { kind: 'task'; html: string; checked: boolean };

class Converter {
  private tableSlots = 0;
  constructor(private readonly context: HtmlImportContext) {}

  embed(kind: 'image' | 'file' | 'encrypted', name = '') {
    this.context.counter.embeds++;
    const label = this.context.labels[kind];
    return escapeHtml(`[${name.trim() ? `${label}: ${name.trim()}` : label}]`);
  }

  tex(element: Element): string | null {
    const annotation = Array.from(element.getElementsByTagName('annotation')).find(item => /tex/i.test(item.getAttribute('encoding') ?? ''));
    return annotation ? clean(annotation.textContent ?? '').trim() : null;
  }

  inline(node: Node, depth: number, inLink = false): string {
    if (node.nodeType === 3) return escapeHtml(collapse(node.nodeValue ?? ''));
    if (node.nodeType !== 1) return '';
    const element = node as Element;
    const tag = tagOf(element);
    if (DROP.has(tag)) return '';
    if (depth > MAX_DEPTH) return escapeHtml(collapse(element.textContent ?? ''));
    const children = (link = inLink) => Array.from(element.childNodes).map(child => {
      const html = this.inline(child, depth + 1, link);
      return BLOCK.has(tagOf(child)) && html ? ` ${html} ` : html;
    }).join('');
    const wrap = (name: string, html: string) => html.replace(/<[^>]*>/g, '').trim() ? `<${name}>${html}</${name}>` : html;
    switch (tag) {
      case 'br': return '<br>';
      case 'b': case 'strong': return wrap('strong', children());
      case 'i': case 'em': return wrap('em', children());
      case 's': case 'strike': case 'del': return wrap('s', children());
      case 'u': case 'ins': return wrap('u', children());
      case 'code': case 'kbd': case 'samp': case 'tt': {
        const text = collapse(element.textContent ?? '');
        return text.trim() ? `<code>${escapeHtml(text)}</code>` : escapeHtml(text);
      }
      case 'a': {
        if (hasClass(element, 'bookmark')) {
          const title = element.querySelector('.bookmark-title')?.textContent?.trim();
          const href = safeLinkUrl(element.getAttribute('href') ?? '');
          const text = escapeHtml(collapse(title || element.getAttribute('href') || ''));
          return href && !inLink ? `<a href="${escapeHtml(href)}">${text}</a>` : text;
        }
        const href = inLink ? null : safeLinkUrl(element.getAttribute('href') ?? '');
        const inner = children(true);
        if (!href) return inner;
        return `<a href="${escapeHtml(href)}">${inner.replace(/<[^>]*>/g, '').trim() ? inner : escapeHtml(href)}</a>`;
      }
      case 'img': {
        // Page and callout icons are decoration, not content.
        if (/(^|\s)(icon|notion-emoji)(\s|$)/.test(element.getAttribute('class') ?? '')) return '';
        return this.embed('image', element.getAttribute('alt') || fileName(element.getAttribute('src') ?? ''));
      }
      case 'en-media': return this.embed((element.getAttribute('type') ?? '').startsWith('image/') ? 'image' : 'file');
      case 'en-crypt': return this.embed('encrypted');
      case 'en-todo': return element.getAttribute('checked') === 'true' ? CHECKED : UNCHECKED;
      case 'input': return element.getAttribute('type')?.toLowerCase() === 'checkbox' ? (element.hasAttribute('checked') ? CHECKED : UNCHECKED) : '';
      case 'math': {
        const tex = this.tex(element);
        return tex ? `<code>${escapeHtml(tex)}</code>` : escapeHtml(collapse(element.textContent ?? ''));
      }
      default: break;
    }
    if (MEDIA.has(tag)) return this.embed('file', fileName(element.getAttribute('src') ?? element.getAttribute('data') ?? ''));
    if (hasClass(element, 'notion-text-equation-token')) {
      const tex = this.tex(element);
      return tex ? `<code>${escapeHtml(tex)}</code>` : '';
    }
    if (tag === 'div' && hasClass(element, 'checkbox')) return hasClass(element, 'checkbox-on') ? CHECKED : UNCHECKED;
    // Formatting written as style (older Evernote notes and other editors); colors and sizes are dropped.
    let html = children();
    if (tag === 'span' || tag === 'font') {
      const style = styleOf(element);
      if (/text-decoration[^;]*line-through/.test(style)) html = wrap('s', html);
      if (/text-decoration[^;]*underline/.test(style)) html = wrap('u', html);
      if (/font-style\s*:\s*italic/.test(style)) html = wrap('em', html);
      if (/font-weight\s*:\s*(bold|bolder|[6-9]00)/.test(style)) html = wrap('strong', html);
    }
    return html;
  }

  /** To-do markers that do not start a line stay as characters. */
  inlineMarks(html: string): string {
    return html.replace(/\u0001[xo]\u0001/g, mark => mark === CHECKED ? '☑ ' : '☐ ');
  }

  inlineOf(element: Element, depth: number): string {
    return this.inlineMarks(Array.from(element.childNodes).map(child => {
      const html = this.inline(child, depth + 1);
      return BLOCK.has(tagOf(child)) && html ? ` ${html} ` : html;
    }).join(''));
  }

  /** Block-level children: inline runs become paragraphs, block children convert on their own. */
  segments(parent: Node, depth: number, listDepth: number, inCell: boolean): Segment[] {
    const result: Segment[] = [];
    let inline = '';
    const flush = () => {
      const html = inline;
      inline = '';
      const text = html.replace(/<[^>]*>/g, '').replace(/\u0001[xo]\u0001/g, '');
      if (!text.replace(/[  ]/g, '').length && !html.includes('\u0001')) {
        if (html.includes('<br>') || text.includes(' ')) result.push({ kind: 'block', html: '<p></p>' });
        return;
      }
      let body = html.replace(/^[ ]+|[ ]+$/g, '').replace(/<br>[ ]*$/, '');
      const marker = /^\u0001([xo])\u0001[ ]*/.exec(body);
      if (marker) body = body.slice(marker[0].length);
      body = this.inlineMarks(body);
      result.push(marker ? { kind: 'task', html: `<p>${body}</p>`, checked: marker[1] === 'x' } : { kind: 'block', html: `<p>${body}</p>` });
    };
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === 1 && BLOCK.has(tagOf(child)) && depth <= MAX_DEPTH) {
        flush();
        result.push(...this.block(child as Element, depth + 1, listDepth, inCell));
      } else inline += this.inline(child, depth + 1);
    }
    flush();
    return result;
  }

  blocks(parent: Node, depth: number, listDepth = 0, inCell = false): string {
    return Converter.join(this.segments(parent, depth, listDepth, inCell));
  }

  static taskItem(checked: boolean, inner: string) {
    return `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? ' checked' : ''}><span></span></label><div>${inner || '<p></p>'}</div></li>`;
  }

  static join(segments: Segment[]): string {
    let html = '';
    let tasks = '';
    for (const segment of segments) {
      if (segment.kind === 'task') { tasks += Converter.taskItem(segment.checked, segment.html); continue; }
      if (tasks) { html += `<ul data-type="taskList">${tasks}</ul>`; tasks = ''; }
      html += segment.html;
    }
    return tasks ? `${html}<ul data-type="taskList">${tasks}</ul>` : html;
  }

  block(element: Element, depth: number, listDepth: number, inCell: boolean): Segment[] {
    const tag = tagOf(element);
    const style = styleOf(element);
    const one = (html: string): Segment[] => html ? [{ kind: 'block', html }] : [];
    if (DROP.has(tag) || tag === 'col' || tag === 'colgroup') return [];
    if (tag === 'nav' && hasClass(element, 'table_of_contents')) return [];
    if (/(^|;)\s*-?-en-codeblock\s*:\s*true/.test(style)) {
      const language = /-en-(?:syntax|codeblock)language\s*:\s*([\w+-]+)/.exec(style)?.[1];
      return one(codeBlock(linesOf(element), language));
    }
    if (/--en-task-group\s*:\s*true/.test(style)) {
      const id = /--en-id\s*:\s*([^;]+)/.exec(element.getAttribute('style') ?? '')?.[1].trim() ?? '';
      const tasks = this.context.taskGroups?.get(id) ?? [];
      this.context.taskGroups?.delete(id);
      return tasks.map(task => ({ kind: 'task', html: `<p>${escapeHtml(collapse(task.title))}</p>`, checked: task.done }));
    }
    if (hasClass(element, 'equation')) {
      const tex = this.tex(element);
      return tex ? one(codeBlock(tex, 'latex')) : [];
    }
    if (hasClass(element, 'callout') || tag === 'aside') return one(this.callout(element, depth, listDepth));
    if (tag === 'table' && hasClass(element, 'properties')) {
      return Array.from(element.querySelectorAll('tr')).map(row => {
        const [name, value] = Array.from(row.children).map(cell => this.inlineOf(cell, depth).replace(/^[ ]+|[ ]+$/g, ''));
        return { kind: 'block', html: `<p>${name ?? ''}${value ? `: ${value}` : ''}</p>` } as Segment;
      }).filter(segment => segment.html !== '<p></p>');
    }
    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = Math.min(Number(tag[1]), 3);
        const html = this.inlineOf(element, depth).replace(/^[ ]+|[ ]+$/g, '').replace(/<br>$/, '');
        return html.replace(/<[^>]*>/g, '').trim() ? one(`<h${level}>${html}</h${level}>`) : [];
      }
      case 'ul': case 'ol': case 'menu': case 'dir':
        return one(listDepth >= MAX_LIST_DEPTH ? this.flatList(element, depth) : this.list(element, depth, listDepth, inCell));
      case 'blockquote': return one(`<blockquote>${this.blocks(element, depth, listDepth, inCell) || '<p></p>'}</blockquote>`);
      case 'pre': case 'xmp': case 'listing': case 'plaintext': {
        const code = element.querySelector('code');
        const language = /language-([\w+ -]+)/.exec(code?.getAttribute('class') ?? element.getAttribute('class') ?? '')?.[1];
        return one(codeBlock(linesOf(element), language));
      }
      case 'hr': return one('<hr>');
      case 'table': return one(this.table(element, depth, listDepth, inCell));
      default: return this.segments(element, depth, listDepth, inCell);
    }
  }

  callout(element: Element, depth: number, listDepth: number): string {
    // Notion: <figure class="callout"><div><span class="icon">💡</span></div><div>text</div></figure>
    const icon = element.querySelector(':scope > div > .icon, :scope > .icon');
    const emoji = icon?.localName === 'span' ? collapse(icon.textContent ?? '').trim() : '';
    icon?.remove();
    const inner = this.blocks(element, depth, listDepth);
    if (!emoji) return `<blockquote>${inner || '<p></p>'}</blockquote>`;
    return `<blockquote>${inner.startsWith('<p>') ? inner.replace('<p>', `<p>${escapeHtml(emoji)} `) : `<p>${escapeHtml(emoji)}</p>${inner}`}</blockquote>`;
  }

  /** Items of a list too deep to nest, as paragraphs. */
  flatList(element: Element, depth: number): string {
    return Array.from(element.children).map(item => this.inlineOf(item, depth).replace(/^[ ]+|[ ]+$/g, '')).filter(Boolean).map(html => `<p>${html}</p>`).join('');
  }

  list(element: Element, depth: number, listDepth: number, inCell: boolean): string {
    type Item = { segments: Segment[]; checked: boolean | null };
    const items: Item[] = [];
    for (const child of Array.from(element.childNodes)) {
      const tag = tagOf(child);
      if (tag === 'li') {
        const li = child as Element;
        let checked: boolean | null = null;
        const evernote = /--en-checked\s*:\s*(true|false)/.exec(styleOf(li));
        if (evernote) checked = evernote[1] === 'true';
        const notion = Array.from(li.children).find(item => tagOf(item) === 'div' && hasClass(item, 'checkbox'));
        if (notion) { checked = hasClass(notion, 'checkbox-on'); notion.remove(); }
        const segments = this.segments(li, depth, listDepth + 1, inCell);
        if (segments[0]?.kind === 'task') {
          checked ??= segments[0].checked;
          segments[0] = { kind: 'block', html: segments[0].html };
        }
        items.push({ segments, checked });
      } else if (tag === 'ul' || tag === 'ol') {
        // A list placed directly in a list belongs to the item before it.
        const nested = this.block(child as Element, depth + 1, listDepth + 1, inCell);
        if (items.length) items[items.length - 1].segments.push(...nested);
        else items.push({ segments: nested, checked: null });
      } else if (child.nodeType === 1 && BLOCK.has(tag)) {
        const segments = this.block(child as Element, depth + 1, listDepth + 1, inCell);
        if (segments.length) items.push({ segments, checked: null });
      } else {
        const html = this.inline(child, depth + 1).replace(/^[ ]+|[ ]+$/g, '');
        if (html.replace(/<[^>]*>/g, '').trim()) items.push({ segments: [{ kind: 'block', html: `<p>${this.inlineMarks(html)}</p>` }], checked: null });
      }
    }
    if (!items.length) return '';
    const content = (segments: Segment[]) => {
      const html = Converter.join(segments);
      return html.startsWith('<p>') ? html : `<p></p>${html}`;
    };
    if (items.some(item => item.checked !== null)) {
      return `<ul data-type="taskList">${items.map(item => Converter.taskItem(item.checked ?? false, content(item.segments))).join('')}</ul>`;
    }
    if (tagOf(element) !== 'ol') return `<ul>${items.map(item => `<li>${content(item.segments)}</li>`).join('')}</ul>`;
    const parsed = Number.parseInt(element.getAttribute('start') ?? '1', 10);
    const start = Number.isSafeInteger(parsed) && parsed >= 1 && parsed < 2147483647 - items.length ? parsed : 1;
    return `<ol start="${start}">${items.map((item, index) => `<li value="${start + index}" style="--li-value: ${start + index}">${content(item.segments)}</li>`).join('')}</ol>`;
  }

  table(element: Element, depth: number, listDepth: number, inCell: boolean): string {
    const rows: Element[] = [];
    for (const child of Array.from(element.children)) {
      const tag = tagOf(child);
      if (tag === 'tr') rows.push(child);
      else if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') rows.push(...Array.from(child.children).filter(row => tagOf(row) === 'tr'));
    }
    const cells = rows.map(row => Array.from(row.children).filter(cell => tagOf(cell) === 'td' || tagOf(cell) === 'th'));
    const width = Math.max(0, ...cells.map(row => row.length));
    if (!rows.length || !width) return '';
    const slots = rows.length * rows.length * width;
    // Too large to store as a table (or inside a cell): one paragraph per row keeps the text.
    if (inCell || this.tableSlots + slots > TABLE_SLOTS) {
      return cells.map(row => row.map(cell => this.inlineOf(cell, depth).replace(/^[ ]+|[ ]+$/g, '')).join(' | ')).filter(text => text.replace(/[ |]/g, ''))
        .map(text => `<p>${text}</p>`).join('');
    }
    this.tableSlots += slots;
    return `<table><tbody>${cells.map(row => `<tr>${Array.from({ length: width }, (_, index) => {
      const cell = row[index];
      const tag = cell && tagOf(cell) === 'th' ? 'th' : 'td';
      return `<${tag}>${(cell && this.blocks(cell, depth, listDepth, true)) || '<p></p>'}</${tag}>`;
    }).join('')}</tr>`).join('')}</tbody></table>`;
  }
}

/** Converts the children of `root` into Drafta editor HTML. */
export function importedHtmlToDrafta(root: Node, context: HtmlImportContext): string {
  const converter = new Converter(context);
  const html = converter.blocks(root, 0);
  // Tasks whose place in the note is unknown go to the end.
  const rest = [...(context.taskGroups?.values() ?? [])].flat();
  context.taskGroups?.clear();
  return rest.length ? html + Converter.join(rest.map(task => ({ kind: 'task', html: `<p>${escapeHtml(collapse(task.title))}</p>`, checked: task.done }))) : html;
}

/**
 * Parses HTML into an inert fragment (template content does not run scripts or load images).
 * Keep its nodes in the fragment's own document: moving one into the page's document makes it live.
 */
export function parseInertHtml(html: string, dom: Document): DocumentFragment {
  const template = dom.createElement('template');
  template.innerHTML = html;
  return template.content;
}
