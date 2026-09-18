import { describe, expect, it } from 'vitest';
import { appTranslations } from './translations';

describe('pin section headings', () => {
  it('names both item types in English', () => {
    expect(appTranslations.en.pinnedTrays).toBe('Pinned trays');
    expect(appTranslations.en.pinnedMemos).toBe('Pinned memos');
  });

  it('uses identical concise headings in every other language', () => {
    for (const [language, text] of Object.entries(appTranslations)) {
      if (language === 'en') continue;
      expect(text.pinnedTrays, language).toBe(text.pinnedMemos);
    }
    expect(appTranslations.ja.pinnedTrays).toBe('ピン留め');
  });
});
