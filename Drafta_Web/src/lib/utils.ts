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

export function removeFormatting(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Strategy:
  // 1. Traverse nodes and accumulate text.
  // 2. Insert '\n' for block elements (P, DIV, H1-H6, LI, BLOCKQUOTE) only if not already ending in \n.
  // 3. Strip color markdown from the result.

  let text = '';

  const isBlock = (node: Node) => {
    return ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'UL', 'OL', 'TR'].includes(node.nodeName);
  };

  // Skip visual-only lists that wrapper UL/OL might introduce if we process LIs
  // But actually, just extracting text with \n for blocks is usually enough.

  // Actually, innerText is close to what we want but handling newlines is browser-dependent.
  // Let's use a manual traversal for predictable newlines.

  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Handle BR
      if (el.tagName === 'BR') {
        text += '\n';
      } else {
        // Recursively process children
        el.childNodes.forEach(traverse);

        // Append newline after block elements if not present
        if (isBlock(el)) {
          if (!text.endsWith('\n')) {
            text += '\n';
          }
        }
      }
    }
  };

  tempDiv.childNodes.forEach(traverse);

  // Strip Color Markdown tags: {color:#...}text{/color} -> text
  // The regex needs to be robust for nested or adjacent tags?
  // Existing stripColorMarkdown utility logic:
  text = text.replace(/\{color:(#[0-9A-Fa-f]{3,6})\}(.+?)\{\/color\}/gi, '$2');

  // Cleanup multiple newlines if any weirdness occurred (optional, but requested "don't increase newlines")
  // The user complained about "double newlines", so let's normalize >2 newlines to 2, or just leave as is if our block logic is tight.
  // Our block logic ensures at least one \n after block.

  // Handle specific case: <p>Text</p><p>Text</p> -> Text\nText\n
  // If we want blank lines between paragraphs: <p>T</p><p><br></p><p>T</p> -> T\n\nT\n

  return text;
}

export function htmlToSimpleText(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Replace block elements with spaces to avoid merged words
  tempDiv.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6').forEach(el => {
    el.after(' ');
  });

  return tempDiv.textContent?.trim() || '';
}

// Rich Text to Plain Text (Markdown-like)
// NEW APPROACH: Instead of relying on textContent, explicitly process each top-level element
// and build output array. This ensures blank lines are counted exactly once.
export function richToPlainMarkdown(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const output: string[] = [];

  // Helper to process inline formatting
  const processInline = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '**$1**')  // Already has **
      .trim();
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

    return clone.textContent?.trim() || '';
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
      child.querySelectorAll('li').forEach((li, idx) => {
        const valueAttr = li.getAttribute('value');
        const num = valueAttr ? parseInt(valueAttr, 10) : idx + 1;
        const text = getCleanText(li);
        output.push(`{ol:${num}}${text}{/ol}`);
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
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let inTaskList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let codeBlockFence = '';
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];

  const processInline = (str: string): string => {
    return str
      // Color syntax: {color:#XXXXXX}text{/color} → <span style="color: #XXXXXX">text</span>
      .replace(/\{color:(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\}(.+?)\{\/color\}/gi, '<span style="color: $1">$2</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
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

  for (const line of lines) {
    const trimmed = line.trim();

    // Code block fence detection
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);

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
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const isSeparator = /^\|[\s\-:|]+\|$/.test(trimmed);
      if (isSeparator) continue;

      if (!result.length || !result[result.length - 1].endsWith('</tr>')) {
        result.push('<table><tbody>');
      }

      const cells = trimmed.slice(1, -1).split('|').map((c: string) => c.trim());
      const isHeader = result[result.length - 1] === '<table><tbody>';
      const cellTag = isHeader ? 'th' : 'td';
      const cellsHtml = cells.map((c: string) => `<${cellTag}>${processInline(c)}</${cellTag}>`).join('');
      result.push(`<tr>${cellsHtml}</tr>`);
      continue;
    } else if (result.length && result[result.length - 1].endsWith('</tr>')) {
      result.push('</tbody></table>');
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
      result.push(`<li data-type="taskItem" data-checked="${isChecked}"><label><input type="checkbox" ${isChecked ? 'checked' : ''}><span></span></label><div><p>${content}</p></div></li>`);
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
    const olTagMatch = trimmed.match(/^\{ol:(\d+)\}(.*?)\{\/ol\}$/);
    if (olTagMatch) {
      if (inTaskList) closeList();
      if (!inList || listType !== 'ol') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ol>');
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
        result.push('<ol>');
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
      const content = processInline(trimmed);
      result.push(`<p>${content}</p>`);
    } else {
      result.push('<p></p>');
    }
  }

  closeList();
  return result.join('');
}
