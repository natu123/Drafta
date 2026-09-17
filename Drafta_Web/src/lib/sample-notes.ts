import type { Lang } from '@/app/languages';
import type { Note } from './types';
import { sampleCopy } from './sample-copy';
import { exampleCopy } from './example-copy';
import { notes as seeds } from './data';

const templates = new Map(seeds.filter(note => note.sampleKey).map(note => [note.id, note]));

export function getSamplePhrases(key: NonNullable<Note['sampleKey']>, lang: Lang): string[] {
  return key === 'welcome' || key === 'reference' ? sampleCopy[lang][key] : exampleCopy[lang][key];
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function localizeSampleNote(note: Note, lang: Lang, modKey: 'Cmd' | 'Ctrl'): Note {
  if (!note.sampleKey) return note;
  const template = templates.get(note.id);
  if (!template || template.sampleKey !== note.sampleKey) return note;
  const source = getSamplePhrases(note.sampleKey, 'en');
  const target = getSamplePhrases(note.sampleKey, lang);
  const phrases = new Map(source.map((phrase, index) => [phrase, target[index]]));
  const content = template.content.replace(/>([^<]+)</g, (match, text: string) => {
    const translated = phrases.get(text.trim());
    return translated === undefined ? match : `>${text.match(/^\s*/)?.[0] ?? ''}${escapeHtml(translated)}${text.match(/\s*$/)?.[0] ?? ''}<`;
  }).replace(/\{\{Mod\}\}/g, modKey);
  const plainTextContent = content.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
  return { ...note, title: phrases.get(template.title) ?? note.title, content, plainTextContent };
}

// Freeze the currently displayed translation when an editable example is changed.
// Clearing its marker prevents later language changes from overwriting user content.
export function applySampleEdit(note: Note, updates: Partial<Note>, lang: Lang, modKey: 'Cmd' | 'Ctrl'): Note {
  return {
    ...localizeSampleNote(note, lang, modKey),
    ...updates,
    sampleKey: note.isProtected ? note.sampleKey : undefined,
  };
}
