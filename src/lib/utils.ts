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

  // Code blocks ```...```
  html = html.replace(/`{3}([\s\S]*?)`{3}/g, (match, p1) => `<pre><code>${p1}</code></pre>`);
  
  // Headings
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');
  
  // HR
  html = html.replace(/^---$/gm, '<hr />');

  // Lists
  html = html.replace(/^\s*[-*] (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^\s*\d+\. (.*$)/gm, '<li>$1</li>');
  // Crude list wrapping
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '');


  // Inline elements
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraphs and line breaks
  html = html.split('\n').map(line => {
    if (line.match(/<(h[1-3]|ul|li|blockquote|hr|pre)/)) {
      return line;
    }
    return line;
  }).join('<br/>');

  return html;
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
