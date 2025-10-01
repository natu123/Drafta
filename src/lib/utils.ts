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

  // Headings
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');
  
  // HR
  html = html.replace(/^---$/gm, '<hr />');

  // Lists
  // To handle lists correctly, we need to wrap them in <ul> or <ol>
  // This is a simplified version and might not handle nested lists perfectly.
  html = html.replace(/^\s*[-*] (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^\s*\d+\. (.*$)/gm, '<li>$1</li>');
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

  // Paragraphs are tricky with this line-by-line approach.
  // We'll wrap lines that are not part of other block elements in <p> tags.
  // A simpler approach for now is to just replace newlines with <br>.
  html = html.replace(/\n/g, '<br />');

  // Remove <br> inside block elements like lists and blockquotes
  html = html.replace(/<ul><br \/>/g, '<ul>').replace(/<br \/><\/ul>/g, '</ul>');
  html = html.replace(/<blockquote><br \/>/g, '<blockquote>').replace(/<br \/><\/blockquote>/g, '</blockquote>');


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
