import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { separatorCopy } from './separator-copy';

describe('separator placing labels', () => {
  it('fills both labels in all 11 languages, away from English outside en', () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(separatorCopy[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe('');
        if (lang !== 'en') expect(value, `${lang}.${key}`).not.toBe(separatorCopy.en[key as keyof typeof separatorCopy.en]);
      }
    }
  });
});
