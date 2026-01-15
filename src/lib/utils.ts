import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeFormatting(html: string): string {
  if (typeof document === 'undefined') return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 1. Replace <br> with newline
  tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // 2. Handle list items
  tempDiv.querySelectorAll('li').forEach(li => {
    const parent = li.parentElement;
    const isOrdered = parent?.tagName === 'OL';
    const index = isOrdered ? Array.from(parent!.children).indexOf(li) : -1;
    const prefix = isOrdered ? `${index + 1}. ` : '- ';

    // Prepend the prefix directly to the item
    li.prepend(document.createTextNode(prefix));
  });

  // 3. Handle horizontal rules
  tempDiv.querySelectorAll('hr').forEach(hr => {
    hr.replaceWith('\n……………………………………………………………\n');
  });

  // 4. Ensure block separation
  // We add a newline after every block element to ensure textContent splits them correctly
  tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, ul, ol').forEach(block => {
    if (!block.textContent?.endsWith('\n')) {
      block.appendChild(document.createTextNode('\n'));
    }
  });

  const text = tempDiv.textContent || '';

  // 5. Cleanup redundant blank lines
  // Split, trim lines, and filter out empty strings to keep it tight
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
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
