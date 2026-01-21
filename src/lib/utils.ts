import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeFormatting(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Note: We do NOT convert <br> to \n here because block separation (step 4) handles it.
  // Converting br causes double newlines in empty paragraphs like <p><br></p>.

  // 2. Handle list items
  tempDiv.querySelectorAll('li').forEach(li => {
    // Unwrap paragraphs inside list items to prevent double newlines (li + p both getting \n)
    const paragraphs = li.querySelectorAll('p');
    paragraphs.forEach(p => {
      // Move all children of p to its parent, before p
      if (p.parentNode) {
        while (p.firstChild) {
          p.parentNode.insertBefore(p.firstChild, p);
        }
        p.remove();
      }
    });

    const parent = li.parentElement;
    const isOrdered = parent?.tagName === 'OL';
    const index = isOrdered ? Array.from(parent!.children).indexOf(li) : -1;
    const prefix = isOrdered ? `${index + 1}. ` : '• ';

    // Prepend the prefix directly to the item
    li.prepend(document.createTextNode(prefix));
  });

  // 3. Handle horizontal rules (no leading \n to prevent extra blank line)
  tempDiv.querySelectorAll('hr').forEach(hr => {
    hr.replaceWith('……………………………………………………………\n');
  });

  // 4. Ensure block separation
  // We add a newline after every block element to ensure textContent splits them correctly
  // Note: ul and ol are excluded because li already handles newlines
  tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach(block => {
    if (!block.textContent?.endsWith('\n')) {
      block.appendChild(document.createTextNode('\n'));
    }
  });

  const text = tempDiv.textContent || '';

  // 5. Preserve exact blank line count without modification
  return text.split('\n')
    .map(line => line.trim())
    .join('\n');
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
export function richToPlainMarkdown(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // IMPORTANT: Handle code blocks FIRST before any inline processing
  // This prevents the inline `code` handler from wrapping <pre><code> content
  tempDiv.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    const languageClass = code?.className.match(/language-(\w+)/);
    const language = languageClass ? languageClass[1] : '';

    // Use textContent to get the actual code content (innerText may add extra newlines)
    let content = code?.textContent || pre.textContent || '';

    // Trim trailing newlines and ensure exactly one at the end
    content = content.replace(/\n+$/, '');
    const codeContent = content + '\n';

    // Robust fence generation (N+1 rule)
    const backtickSequences = codeContent.match(/`+/g) || [];
    const maxBacktickLength = Math.max(0, ...backtickSequences.map(s => s.length));
    const fenceLength = Math.max(3, maxBacktickLength + 1);
    const fence = '`'.repeat(fenceLength);

    pre.replaceWith(fence + language + '\n' + codeContent + fence + '\n');
  });

  // Note: We do NOT convert <br> to \n here because block separation handles it.
  // Converting br causes double newlines in empty paragraphs like <p><br></p>.

  // Handle inline formatting (AFTER pre blocks are removed)
  tempDiv.querySelectorAll('strong, b').forEach(el => {
    el.replaceWith(`**${el.textContent}**`);
  });
  tempDiv.querySelectorAll('em, i').forEach(el => {
    el.replaceWith(`_${el.textContent}_`);
  });
  tempDiv.querySelectorAll('s, strike, del').forEach(el => {
    el.replaceWith(`~~${el.textContent}~~`);
  });
  tempDiv.querySelectorAll('code').forEach(el => {
    el.replaceWith(`\`${el.textContent}\``);
  });

  // Handle headings
  tempDiv.querySelectorAll('h1').forEach(el => {
    el.prepend(document.createTextNode('# '));
  });
  tempDiv.querySelectorAll('h2').forEach(el => {
    el.prepend(document.createTextNode('## '));
  });
  tempDiv.querySelectorAll('h3').forEach(el => {
    el.prepend(document.createTextNode('### '));
  });

  // Handle blockquotes
  tempDiv.querySelectorAll('blockquote').forEach(bq => {
    const lines = (bq.textContent || '').split('\n');
    const quoted = lines.map(l => `> ${l.trim()}`).join('\n');
    bq.replaceWith(quoted);
  });

  // Handle task lists - convert entire list to text lines
  tempDiv.querySelectorAll('ul[data-type="taskList"]').forEach(ul => {
    const items = ul.querySelectorAll('li[data-type="taskItem"]');
    const lines: string[] = [];
    items.forEach(li => {
      const isChecked = li.getAttribute('data-checked') === 'true';
      const prefix = isChecked ? '- [x] ' : '- [ ] ';
      const textDiv = li.querySelector('div');
      const textContent = textDiv?.textContent?.trim() || '';
      lines.push(prefix + textContent);
    });
    ul.replaceWith(lines.join('\n') + '\n');
  });

  // Handle regular unordered lists
  tempDiv.querySelectorAll('ul:not([data-type="taskList"])').forEach(ul => {
    const items = ul.querySelectorAll('li');
    const lines: string[] = [];
    items.forEach(li => {
      const textContent = li.textContent?.trim() || '';
      lines.push('- ' + textContent);
    });
    ul.replaceWith(lines.join('\n') + '\n');
  });

  // Handle ordered lists
  tempDiv.querySelectorAll('ol').forEach(ol => {
    const items = ol.querySelectorAll('li');
    const lines: string[] = [];
    items.forEach((li, idx) => {
      const textContent = li.textContent?.trim() || '';
      lines.push(`${idx + 1}. ` + textContent);
    });
    ol.replaceWith(lines.join('\n') + '\n');
  });

  // Handle tables
  tempDiv.querySelectorAll('table').forEach(table => {
    const rows = table.querySelectorAll('tr');
    const mdRows: string[] = [];

    rows.forEach((row, rowIdx) => {
      const cells = row.querySelectorAll('th, td');
      const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
      mdRows.push('| ' + cellTexts.join(' | ') + ' |');

      // Add separator after header row
      if (rowIdx === 0) {
        const separator = cellTexts.map(() => '---').join(' | ');
        mdRows.push('| ' + separator + ' |');
      }
    });

    table.replaceWith(mdRows.join('\n') + '\n');
  });

  // Handle horizontal rules with markdown-style
  tempDiv.querySelectorAll('hr').forEach(hr => {
    hr.replaceWith('---\n');  // No leading \n to prevent extra blank line
  });

  // Ensure block separation
  tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6').forEach(block => {
    if (!block.textContent?.endsWith('\n')) {
      block.appendChild(document.createTextNode('\n'));
    }
  });

  const text = tempDiv.textContent || '';

  // Preserve blank lines as-is without aggressive normalization
  // Users may intentionally want multiple blank lines for visual separation
  return text.split('\n')
    .map(line => line.trim())
    .join('\n');
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
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
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

    // Ordered list
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (inTaskList) closeList();
      if (!inList || listType !== 'ol') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      const content = processInline(orderedMatch[2]);
      result.push(`<li><p>${content}</p></li>`);
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
      result.push('<p><br></p>');
    }
  }

  closeList();
  return result.join('');
}
