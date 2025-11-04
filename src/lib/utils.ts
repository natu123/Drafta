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
  });

  // Add newlines after paragraphs and list containers
  tempDiv.querySelectorAll('p, ul, ol, h1, h2, h3').forEach(block => {
    // Check if the block is not empty and doesn't already end with a newline
    if (block.textContent?.trim() && !block.textContent.endsWith('\n')) {
        const newline = document.createTextNode('\n');
        block.appendChild(newline);
    }
  });

  // Get text content, which now includes the markers and newlines
  let text = tempDiv.textContent || '';
  
  // Clean up extra whitespace and newlines
  text = text.replace(/\n\s*\n/g, '\n'); // Replace multiple newlines with a single one
  
  return text.trim();
}
