import { describe, expect, it } from 'vitest';

import {
  LANGUAGE_OPTIONS,
  LANGS,
  LANG_DIRECTION,
  LANG_LABEL,
  LANG_SHORT,
  isLang,
} from './languages';

describe('language metadata', () => {
  it('keeps all supported language codes in their display order', () => {
    expect(LANGS).toEqual([
      'en',
      'ja',
      'zh-CN',
      'ko',
      'hi',
      'ar',
      'ru',
      'id',
      'es',
      'fr',
      'pt-BR',
    ]);
    expect(new Set(LANGS).size).toBe(LANGUAGE_OPTIONS.length);
  });

  it('derives labels and short labels from the shared metadata', () => {
    for (const { code, label, shortLabel } of LANGUAGE_OPTIONS) {
      expect(LANG_LABEL[code]).toBe(label);
      expect(LANG_SHORT[code]).toBe(shortLabel);
    }
  });

  it('marks Arabic as right-to-left and all other languages as left-to-right', () => {
    expect(LANG_DIRECTION.ar).toBe('rtl');

    for (const { code } of LANGUAGE_OPTIONS) {
      if (code !== 'ar') {
        expect(LANG_DIRECTION[code]).toBe('ltr');
      }
    }
  });

  it('accepts only supported language codes', () => {
    for (const code of LANGS) {
      expect(isLang(code)).toBe(true);
    }

    expect(isLang('en-US')).toBe(false);
    expect(isLang(null)).toBe(false);
  });
});
