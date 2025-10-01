import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseMarkdown(text: string): string {
  if (!text) return '';
  
  let html = text
    // Escape HTML to be safe, but allow our specific color spans
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;span style="color: (.*?);"&gt;(.*?)&lt;\/span&gt;/g, '<span style="color: $1;">$2</span>');

  // Process block-level elements first
  const blocks = html.split(/(\n\n+)/);
  const processedBlocks = blocks.map(block => {
    if (block.match(/^\s*$/)) return block;

    // Headings
    if (block.startsWith('# ')) return block.replace(/^# (.*$)/, '<h1 class="h1">$1</h1>');
    if (block.startsWith('## ')) return block.replace(/^## (.*$)/, '<h2 class="h2">$1</h2>');
    if (block.startsWith('### ')) return block.replace(/^### (.*$)/, '<h3 class="h3">$1</h3>');

    // Blockquotes
    if (block.startsWith('> ')) {
      const bqContent = block.replace(/^\> /gm, '');
      return `<blockquote class="blockquote">${bqContent}</blockquote>`;
    }

    // Lists
    if (block.startsWith('- ') || block.startsWith('* ') || block.match(/^\d+\. /)) {
      const lines = block.split('\n');
      let listHtml = '';
      let listType = '';

      lines.forEach(line => {
        const ulMatch = line.match(/^[-*] (.*)/);
        const olMatch = line.match(/^\d+\. (.*)/);
        const currentList = ulMatch ? 'ul' : 'ol';

        if (listType && currentList !== listType) {
          listHtml += `</${listType}>`;
          listType = '';
        }

        if (!listType) {
          listType = currentList;
          listHtml += `<${listType} class="${listType}">`;
        }

        if (ulMatch) listHtml += `<li class="li">${ulMatch[1]}</li>`;
        if (olMatch) listHtml += `<li class="li">${olMatch[1]}</li>`;
      });
      if (listType) listHtml += `</${listType}>`;
      return listHtml;
    }

    // Default to paragraph
    return `<p class="p">${block}</p>`;
  });

  html = processedBlocks.join('');

  // Process inline elements
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong class="strong">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="strong">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="em">$1</em>')
    .replace(/_(.*?)_/g, '<em class="em">$1</em>')
    .replace(/~~(.*?)~~/g, '<del class="del">$1</del>')
    .replace(/`([^`]+)`/g, '<code class="code">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="a">$1</a>');

  // Cleanup paragraph wrappers around block elements
  html = html.replace(/<p class="p">(<(?:h1|h2|h3|ul|ol|blockquote)[^>]*>.*<\/(?:h1|h2|h3|ul|ol|blockquote)>)<\/p>/g, '$1');
  
  return html.replace(/\n/g, '<br />');
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // remove html tags from colors
    .replace(/#+\s/g, '') // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/^\s*[-*+]\s/gm, '') // lists
    .replace(/^\s*\d+\.\s/gm, '') // ordered lists
    .replace(/^>\s/gm, ''); // blockquotes
}
