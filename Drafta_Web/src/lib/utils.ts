import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Color Markdown helpers for title color feature
// Syntax: {color:#XXXXXX}text{/color}

/**
 * Strip Color Markdown tags from text, returning plain text only
 * Used for Central Column where no color should be displayed
 */
export function stripColorMarkdown(text: string): string {
  return text.replace(/\{color:#[0-9A-Fa-f]{3,6}\}(.+?)\{\/color\}/gi, '$1');
}

/**
 * Parse Color Markdown to extract color and clean text
 * Returns { color: string | null, text: string }
 */
export function parseColorMarkdown(text: string): { color: string | null; text: string } {
  const match = text.match(/^\{color:(#[0-9A-Fa-f]{3,6})\}(.+?)\{\/color\}$/i);
  if (match) {
    return { color: match[1], text: match[2] };
  }
  return { color: null, text };
}

export function normalizeOrderedListTags(text: string): string {
  return text.replace(
    /\{ol:(\d+)\}([\s\S]*?)(?:\{\/ol\}|\[\/ol\})/gi,
    (_match, num, body) => {
      const normalizedBody = String(body).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedBody.split('\n');
      const firstLine = lines[0] ?? '';
      const continuation = lines
        .slice(1)
        .map((line) => (line === '' ? '' : `    ${line}`));
      return [`${num}. ${firstLine}`, ...continuation].join('\n');
    }
  );
}

export function normalizeOrderedListHtml(html: string): string {
  if (typeof document === 'undefined') return html;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  tempDiv.querySelectorAll('ol').forEach((ol) => {
    let nextNumber =
      parseInt(ol.getAttribute('start') || '', 10) ||
      parseInt(ol.getAttribute('startFrom') || '', 10) ||
      parseInt(ol.getAttribute('data-start-from') || '', 10) ||
      1;

    const listItems = Array.from(ol.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'LI'
    );

    listItems.forEach((li, idx) => {
      const rawValue = parseInt(li.getAttribute('value') || '', 10);
      const fallback = nextNumber;
      const computed = Number.isFinite(rawValue)
        ? Math.max(rawValue, fallback)
        : fallback;

      li.setAttribute('value', String(computed));
      li.setAttribute('style', `--li-value: ${computed}`);
      nextNumber = computed + 1;
    });
  });

  return tempDiv.innerHTML;
}

export function removeFormatting(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Keep two-level separation:
  // - "\n"   : line breaks inside the same visual block (<br>, table row, etc.)
  // - "\n\n" : visual block boundaries (paragraph, heading, list item, etc.)
  const blocks: string[] = [];
  const blockTags = new Set([
    'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI',
    'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'TABLE', 'TR',
  ]);

  const normalizeText = (text: string): string => text.replace(/\u00A0/g, ' ');

  const pushBlock = (value: string) => {
    blocks.push(value.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  };

  const extractInlineText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeText(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as HTMLElement;
    if (element.tagName === 'BR') {
      return '\n';
    }

    let result = '';
    element.childNodes.forEach((child) => {
      const childText = extractInlineText(child);
      if (!childText) return;

      const isChildBlock =
        child.nodeType === Node.ELEMENT_NODE &&
        blockTags.has((child as HTMLElement).tagName) &&
        (child as HTMLElement).tagName !== 'BR';

      if (isChildBlock && result !== '' && !result.endsWith('\n')) {
        result += '\n';
      }

      result += childText;

      if (isChildBlock && !result.endsWith('\n')) {
        result += '\n';
      }
    });

    return result;
  };

  const getDirectListItems = (listElement: HTMLElement): HTMLElement[] => {
    return Array.from(listElement.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'LI'
    );
  };

  const processList = (listElement: HTMLElement) => {
    const isTaskList = listElement.getAttribute('data-type') === 'taskList';
    let orderedIndex =
      Number.parseInt(listElement.getAttribute('start') || '', 10) ||
      Number.parseInt(listElement.getAttribute('startFrom') || '', 10) ||
      Number.parseInt(listElement.getAttribute('data-start-from') || '', 10) ||
      1;
    if (!Number.isFinite(orderedIndex)) {
      orderedIndex = 1;
    }

    getDirectListItems(listElement).forEach((listItem) => {
      const clone = listItem.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('ul, ol').forEach((nested) => nested.remove());

      const text = extractInlineText(clone).replace(/\n+/g, ' ').replace(/\s+$/g, '');

      if (isTaskList) {
        const checked = listItem.getAttribute('data-checked') === 'true';
        pushBlock(`${checked ? '[x]' : '[ ]'} ${text}`);
        return;
      }

      if (listElement.tagName === 'OL') {
        const valueAttr = Number.parseInt(listItem.getAttribute('value') || '', 10);
        const itemNumber = Number.isFinite(valueAttr)
          ? Math.max(valueAttr, orderedIndex)
          : orderedIndex;
        pushBlock(`${itemNumber}. ${text}`);
        orderedIndex = itemNumber + 1;
        return;
      }

      pushBlock(`- ${text}`);
    });
  };

  const processTable = (tableElement: HTMLElement) => {
    const table = tableElement as HTMLTableElement;
    const rows = Array.from(table.rows);
    if (rows.length === 0) {
      pushBlock(extractInlineText(tableElement));
      return;
    }

    const rowLines = rows.map((row) => {
      const cellTexts = Array.from(row.cells).map((cell) => {
        return extractInlineText(cell).replace(/\n/g, ' ').replace(/\s+$/g, '');
      });
      return `| ${cellTexts.join(' | ')} |`;
    });

    const markdownLines: string[] = [];
    rowLines.forEach((line, index) => {
      markdownLines.push(line);
      // Keep markdown table structure explicitly:
      // header row + separator row + data rows
      if (index === 0) {
        const headerCellCount = Math.max(1, rows[0].cells.length);
        markdownLines.push(`| ${Array(headerCellCount).fill('---').join(' | ')} |`);
      }
    });

    pushBlock(markdownLines.join('\n'));
  };

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeText(node.textContent || '');
      if (text.trim() !== '') {
        pushBlock(text);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName;

    if (tagName === 'UL' || tagName === 'OL') {
      processList(element);
      return;
    }

    if (tagName === 'TABLE') {
      processTable(element);
      return;
    }

    if (tagName === 'HR') {
      pushBlock('---');
      return;
    }

    if (tagName === 'BLOCKQUOTE') {
      const quoteText = extractInlineText(element).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const quoteLines = quoteText.split('\n');
      while (quoteLines.length > 0 && quoteLines[quoteLines.length - 1] === '') {
        quoteLines.pop();
      }

      if (quoteLines.length === 0) {
        pushBlock('> ');
      } else {
        pushBlock(quoteLines.map((line) => `> ${line}`).join('\n'));
      }
      return;
    }

    if (tagName === 'DIV') {
      const hasDirectBlockChild = Array.from(element.children).some(
        (child) => child instanceof HTMLElement && blockTags.has(child.tagName)
      );

      if (hasDirectBlockChild) {
        element.childNodes.forEach(processNode);
        return;
      }
    }

    if (tagName === 'BR') {
      if (blocks.length === 0) {
        pushBlock('');
      } else {
        blocks[blocks.length - 1] += '\n';
      }
      return;
    }

    pushBlock(extractInlineText(element));
  };

  tempDiv.childNodes.forEach(processNode);

  return normalizeOrderedListTags(
    blocks
    .join('\n\n')
    .replace(/\{color:(#[0-9A-Fa-f]{3,6})\}([\s\S]+?)\{\/color\}/gi, '$2')
  );
}

export function htmlToSimpleText(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Replace block elements with spaces to avoid merged words
  tempDiv.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6').forEach(el => {
    el.after(' ');
  });

  let text = tempDiv.textContent?.trim() || '';

  // Strip Markdown syntax for clean preview display
  // Note: Be careful not to strip CSS comments /* */ or other non-Markdown patterns
  text = text
    .replace(/^#{1,6}\s+/gm, '')           // Headings: # ## ### etc.
    .replace(/^[-*+]\s+/gm, '')            // Unordered list: - * +
    .replace(/^\d+\.\s+/gm, '')            // Ordered list: 1. 2. etc.
    .replace(/^>\s+/gm, '')                // Blockquote: >
    .replace(/^-{3,}$/gm, '')              // Horizontal rule: ---
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // Bold: **text** (no * inside)
    .replace(/__([^_]+)__/g, '$1')         // Bold: __text__ (no _ inside)
    .replace(/(?<![/*])\*([^*\s][^*]*)\*(?![/*])/g, '$1')  // Italic: *text* (not /* */ CSS comments)
    .replace(/(?<!\w)_([^_\s][^_]*)_(?!\w)/g, '$1')        // Italic: _text_ (word boundary)
    .replace(/~~([^~]+)~~/g, '$1')         // Strikethrough: ~~text~~
    .replace(/`([^`]+)`/g, '$1')           // Inline code: `code`
    .replace(/```[\s\S]*?```/g, '')        // Code block: ```...```
    .replace(/\{color:[^}]+\}(.+?)\{\/color\}/gi, '$1')  // Color tags
    .replace(/\{ol:\d+\}(.+?)\{\/ol\}/gi, '$1')          // Ordered list tags
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')             // Links: [text](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')            // Images: ![alt](url)
    .replace(/\s+/g, ' ')                  // Collapse multiple spaces
    .trim();

  return text;
}

// Rich Text to Plain Text (Markdown-like)
// NEW APPROACH: Instead of relying on textContent, explicitly process each top-level element
// and build output array. This ensures blank lines are counted exactly once.
export function richToPlainMarkdown(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const output: string[] = [];

  const extractTextWithBreaks = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').replace(/\u00A0/g, ' ');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as HTMLElement;
    if (element.tagName === 'BR') {
      return '\n';
    }

    let text = '';
    element.childNodes.forEach((child) => {
      text += extractTextWithBreaks(child);
    });
    return text;
  };

  // Helper to get clean text content (handles inline formatting)
  const getCleanText = (el: Element): string => {
    // Clone to avoid modifying original
    const clone = el.cloneNode(true) as Element;

    // Process inline formatting
    clone.querySelectorAll('strong, b').forEach(e => {
      e.replaceWith(`**${e.textContent}**`);
    });
    clone.querySelectorAll('em, i').forEach(e => {
      e.replaceWith(`_${e.textContent}_`);
    });
    clone.querySelectorAll('s, strike, del').forEach(e => {
      e.replaceWith(`~~${e.textContent}~~`);
    });
    clone.querySelectorAll('code').forEach(e => {
      e.replaceWith(`\`${e.textContent}\``);
    });
    // Handle colored text: <span style="color: ..."> → {color:#XXX}text{/color}
    // Supports both HEX (#XXXXXX) and RGB (rgb(r, g, b)) formats
    clone.querySelectorAll('span[style*="color"]').forEach(e => {
      const style = e.getAttribute('style') || '';

      // Try HEX format first: #XXXXXX or #XXX
      let hexMatch = style.match(/color:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})/i);
      if (hexMatch) {
        e.replaceWith(`{color:${hexMatch[1]}}${e.textContent}{/color}`);
        return;
      }

      // Try RGB format: rgb(r, g, b)
      const rgbMatch = style.match(/color:\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        e.replaceWith(`{color:${hex}}${e.textContent}{/color}`);
        return;
      }
    });

    return extractTextWithBreaks(clone);
  };

  // Check if element is an empty paragraph
  const isEmptyParagraph = (el: Element): boolean => {
    if (el.tagName !== 'P') return false;
    const onlyBr = el.children.length === 1 && el.children[0].tagName === 'BR';
    const isEmpty = el.textContent?.trim() === '' && el.children.length === 0;
    return onlyBr || isEmpty;
  };

  // Process each top-level child
  Array.from(tempDiv.children).forEach(child => {
    const tagName = child.tagName.toUpperCase();

    // Code block (pre)
    if (tagName === 'PRE') {
      const code = child.querySelector('code');
      const languageClass = code?.className.match(/language-(\w+)/);
      const language = languageClass ? languageClass[1] : '';
      let content = code?.textContent || child.textContent || '';
      content = content.replace(/\n+$/, '');

      // Robust fence generation
      const backtickSequences = content.match(/`+/g) || [];
      const maxBacktickLength = Math.max(0, ...backtickSequences.map(s => s.length));
      const fence = '`'.repeat(Math.max(3, maxBacktickLength + 1));

      output.push(fence + language);
      content.split('\n').forEach(line => output.push(line));
      output.push(fence);
      return;
    }

    // Headings
    if (tagName === 'H1') {
      output.push('# ' + getCleanText(child));
      return;
    }
    if (tagName === 'H2') {
      output.push('## ' + getCleanText(child));
      return;
    }
    if (tagName === 'H3') {
      output.push('### ' + getCleanText(child));
      return;
    }

    // Horizontal rule
    if (tagName === 'HR') {
      output.push('---');
      return;
    }

    // Blockquote
    if (tagName === 'BLOCKQUOTE') {
      const text = getCleanText(child);
      text.split('\n').forEach(line => output.push('> ' + line.trim()));
      return;
    }

    // Task list
    if (tagName === 'UL' && child.getAttribute('data-type') === 'taskList') {
      child.querySelectorAll('li[data-type="taskItem"]').forEach(li => {
        const isChecked = li.getAttribute('data-checked') === 'true';
        const prefix = isChecked ? '- [x] ' : '- [ ] ';
        const textDiv = li.querySelector('div');
        const text = textDiv ? getCleanText(textDiv) : '';
        output.push(prefix + text);
      });
      return;
    }

    // Unordered list
    if (tagName === 'UL') {
      child.querySelectorAll('li').forEach(li => {
        output.push('- ' + getCleanText(li));
      });
      return;
    }

    // Ordered list - output as custom tag syntax (like color syntax)
    // Format: {ol:N}text{/ol} where N is the item number
    if (tagName === 'OL') {
      const listStart =
        parseInt(child.getAttribute('start') || '', 10) ||
        parseInt(child.getAttribute('startFrom') || '', 10) ||
        parseInt(child.getAttribute('data-start-from') || '', 10) ||
        1;

      let nextExpected = listStart;
      child.querySelectorAll('li').forEach((li, idx) => {
        const valueAttr = parseInt(li.getAttribute('value') || '', 10);
        const fallback = listStart + idx;
        const base = Math.max(nextExpected, fallback);
        const num = Number.isFinite(valueAttr) ? Math.max(valueAttr, base) : base;
        const text = getCleanText(li);
        output.push(`{ol:${num}}${text}{/ol}`);
        nextExpected = num + 1;
      });
      return;
    }

    // Table
    if (tagName === 'TABLE') {
      const rows = child.querySelectorAll('tr');
      rows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll('th, td');
        const cellTexts = Array.from(cells).map(cell => getCleanText(cell));
        output.push('| ' + cellTexts.join(' | ') + ' |');
        if (rowIdx === 0) {
          output.push('| ' + cellTexts.map(() => '---').join(' | ') + ' |');
        }
      });
      return;
    }

    // Empty paragraph = blank line
    if (isEmptyParagraph(child)) {
      output.push('');  // Exactly one blank line
      return;
    }

    // Regular paragraph
    if (tagName === 'P') {
      output.push(getCleanText(child));
      return;
    }

    // Div (fallback)
    if (tagName === 'DIV') {
      output.push(getCleanText(child));
      return;
    }
  });

  return output.join('\n');
}

// Plain Text (Markdown-like) to Rich Text HTML
export function plainMarkdownToRich(text: string): string {
  // Normalize line endings (CRLF → LF)
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n');
  const result: string[] = [];
  let inList = false;
  let inTaskList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inTable = false;
  let tableRowCount = 0;
  let inCodeBlock = false;
  let codeBlockFence = '';
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];

  const appendToLastOrderedListItem = (htmlLine: string): boolean => {
    for (let i = result.length - 1; i >= 0; i--) {
      if (!result[i].startsWith('<li')) continue;
      result[i] = result[i].replace(/<\/p><\/li>$/, `<br>${htmlLine}</p></li>`);
      return true;
    }
    return false;
  };

  const processInline = (str: string): string => {
    return str
      // Color syntax: {color:#XXXXXX}text{/color} → <span style="color: #XXXXXX">text</span>
      .replace(/\{color:(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\}(.+?)\{\/color\}/gi, '<span style="color: $1">$2</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Avoid parsing CSS comment markers like /* ... */ as italic markdown.
      .replace(/(?<![/*])\*(?![/*])([^*]+)\*(?![/*])/g, '<em>$1</em>')
      .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  const closeList = () => {
    if (inList || inTaskList) {
      if (inTaskList) {
        result.push('</ul>');
        inTaskList = false;
      } else {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
      }
      inList = false;
      listType = null;
    }
  };

  const closeTable = () => {
    if (inTable) {
      result.push('</tbody></table>');
      inTable = false;
      tableRowCount = 0;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isTableRow = !inCodeBlock && trimmed.startsWith('|') && trimmed.endsWith('|');

    // Ensure an open table is closed before handling non-table lines.
    if (inTable && !isTableRow) {
      closeTable();
    }

    // Code block fence detection - use original line to preserve indentation check
    // Fences must start at the beginning of the line (no leading whitespace)
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);

    if (fenceMatch) {
      const fence = fenceMatch[1];
      const rest = fenceMatch[2].trim();

      if (inCodeBlock) {
        // Check for closing fence
        if (fence.charAt(0) === codeBlockFence.charAt(0)) {
          const codeHtml = codeBlockContent.join('\n');
          const escapedHtml = codeHtml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          result.push(`<pre><code${codeBlockLang ? ` class="language-${codeBlockLang}"` : ''}>${escapedHtml}</code></pre>`);
          inCodeBlock = false;
          codeBlockContent = [];
          codeBlockLang = '';
          codeBlockFence = '';
          continue;
        }
      } else {
        closeTable();
        closeList();
        codeBlockFence = fence;
        codeBlockLang = rest;
        inCodeBlock = true;
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Ordered list continuation line (e.g. "    detail" after "1. item")
    // Keep it inside the same list item as a line break.
    const isIndentedLine = /^[ \t]+/.test(line);
    if (inList && listType === 'ol' && isIndentedLine && trimmed !== '') {
      const continuationText = line.replace(/^[ \t]+/, '');
      if (appendToLastOrderedListItem(processInline(continuationText))) {
        continue;
      }
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = processInline(headingMatch[2]);
      result.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      closeList();
      const content = processInline(trimmed.slice(2));
      result.push(`<blockquote><p>${content}</p></blockquote>`);
      continue;
    }

    // Table row
    if (isTableRow) {
      closeList();
      if (!inTable) {
        result.push('<table><tbody>');
        inTable = true;
        tableRowCount = 0;
      }

      const isSeparator = /^\|[\s\-:|]+\|$/.test(trimmed);
      if (isSeparator) continue;

      const cells = trimmed.slice(1, -1).split('|').map((c: string) => c.trim());
      const isHeader = tableRowCount === 0;
      const cellTag = isHeader ? 'th' : 'td';
      const cellsHtml = cells.map((c: string) => `<${cellTag}>${processInline(c)}</${cellTag}>`).join('');
      result.push(`<tr>${cellsHtml}</tr>`);
      tableRowCount += 1;
      continue;
    }

    // Task list
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      if (!inTaskList) {
        closeList();
        result.push('<ul data-type="taskList">');
        inTaskList = true;
      }
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const content = processInline(taskMatch[2]);
      result.push(`<li data-type="taskItem" data-checked="${isChecked}"><label><input type="checkbox" name="task-item" ${isChecked ? 'checked' : ''}><span></span></label><div><p>${content}</p></div></li>`);
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inTaskList) closeList();
      if (!inList || listType !== 'ul') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const content = processInline(trimmed.slice(2));
      result.push(`<li><p>${content}</p></li>`);
      continue;
    }

    // Ordered list - Custom tag format: {ol:N}text{/ol} (空の内容も許可)
    const olTagMatch = trimmed.match(/^\{ol:(\d+)\}(.*?)(?:\{\/ol\}|\[\/ol\})$/);
    if (olTagMatch) {
      if (inTaskList) closeList();
      if (!inList || listType !== 'ol') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        const startNum = parseInt(olTagMatch[1], 10);
        result.push(`<ol start="${startNum}">`);
        inList = true;
        listType = 'ol';
      }
      const num = parseInt(olTagMatch[1], 10);
      const content = olTagMatch[2] ? processInline(olTagMatch[2]) : '';
      result.push(`<li value="${num}" style="--li-value: ${num}"><p>${content}</p></li>`);
      continue;
    }

    // Ordered list - Markdown format: N. text (fallback)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (inTaskList) closeList();
      if (!inList || listType !== 'ol') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        const startNum = parseInt(orderedMatch[1], 10);
        result.push(`<ol start="${startNum}">`);
        inList = true;
        listType = 'ol';
      }
      const num = parseInt(orderedMatch[1], 10);
      const content = processInline(orderedMatch[2]);
      result.push(`<li value="${num}" style="--li-value: ${num}"><p>${content}</p></li>`);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      closeList();
      result.push('<hr />');
      continue;
    }

    // Regular paragraph
    closeList();
    if (trimmed) {
      const tabExpandedLine = line.replace(/\t/g, '    ');
      const leadingSpaces = tabExpandedLine.match(/^ +/)?.[0] || '';
      const bodyLine = tabExpandedLine.slice(leadingSpaces.length);
      const preservedLeading = '&nbsp;'.repeat(leadingSpaces.length);
      const content = preservedLeading + processInline(bodyLine);
      result.push(`<p>${content}</p>`);
    } else {
      result.push('<p></p>');
    }
  }

  closeTable();
  closeList();
  return result.join('');
}
