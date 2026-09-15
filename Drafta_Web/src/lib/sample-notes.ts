import type { Lang } from '@/app/languages';
import type { Note } from './types';
import { sampleCopy } from './sample-copy';
import { notes as seeds } from './data';

const templates = new Map(seeds.filter(note => note.sampleKey).map(note => [note.sampleKey, note]));

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function localizeSampleNote(note: Note, lang: Lang, modKey: 'Cmd' | 'Ctrl'): Note {
  if (!note.sampleKey || !note.isProtected) return note;
  const template = templates.get(note.sampleKey);
  if (!template) return note;
  const source = sampleCopy.en[note.sampleKey];
  const target = sampleCopy[lang][note.sampleKey];
  const phrases = new Map(source.map((phrase, index) => [phrase, target[index]]));
  const content = template.content.replace(/>([^<]+)</g, (match, text: string) => {
    const translated = phrases.get(text.trim());
    return translated === undefined ? match : `>${text.match(/^\s*/)?.[0] ?? ''}${escapeHtml(translated)}${text.match(/\s*$/)?.[0] ?? ''}<`;
  }).replace(/\{\{Mod\}\}/g, modKey);
  const plainTextContent = content.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
  return { ...note, title: target[0], content, plainTextContent };
}
