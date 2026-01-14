import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function htmlToPlainText(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Replace <br> with newline characters
  tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // Handle list items
  tempDiv.querySelectorAll('li').forEach(li => {
    const parent = li.parentElement;
    if (parent?.tagName === 'UL') {
      li.prepend('･ ');
    } else if (parent?.tagName === 'OL') {
      const index = Array.from(parent.children).indexOf(li);
      li.prepend(`${index + 1}. `);
    }
    // Ensure list items are followed by a newline if they aren't already
    if (!li.textContent?.endsWith('\n')) {
      li.appendChild(document.createTextNode('\n'));
    }
  });

  // Handle horizontal rules
  tempDiv.querySelectorAll('hr').forEach(hr => {
    hr.replaceWith('\n……………………………………………………………\n');
  });

  // Add newlines after block elements
  tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, ul, ol').forEach(block => {
    // Only add a newline if it's a block-level element and doesn't already end with one
    if (!block.textContent?.endsWith('\n')) {
      block.appendChild(document.createTextNode('\n'));
    }
  });

  // Get text content, which now includes correctly placed newlines
  let text = tempDiv.textContent || '';

  // Clean up leading/trailing whitespace but keep internal formatting
  return text.trim();
}
