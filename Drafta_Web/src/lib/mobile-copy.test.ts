import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { withName } from './a11y-copy';
import { mobileCopy } from './mobile-copy';

describe('phone navigation and memo action labels', () => {
  it('fills every label in all 11 languages, with the tray name only where it belongs', () => {
    expect(LANGS).toHaveLength(11);
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(mobileCopy[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe('');
        expect(value.includes('{name}'), `${lang}.${key}`).toBe(key === 'addMemoTo');
      }
    }
  });

  it('translates every label away from English outside en', () => {
    for (const lang of LANGS.filter(code => code !== 'en')) {
      for (const [key, value] of Object.entries(mobileCopy[lang])) {
        expect(value, `${lang}.${key}`).not.toBe(mobileCopy.en[key as keyof typeof mobileCopy.en]);
      }
    }
  });

  it('names the tray a memo is added to', () => {
    expect(withName(mobileCopy.ja.addMemoTo, 'Inbox')).toBe('Inboxにメモを追加');
    expect(withName(mobileCopy.en.addMemoTo, 'Work')).toBe('Add memo to Work');
  });
});
