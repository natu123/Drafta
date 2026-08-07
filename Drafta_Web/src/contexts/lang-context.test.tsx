/**
 * @vitest-environment jsdom
 */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LANG_STORAGE_KEY } from '@/app/languages';
import { LangProvider, useLang } from './lang-context';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let currentLanguage: ReturnType<typeof useLang> | null = null;

function LanguageProbe() {
  currentLanguage = useLang();
  return null;
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  currentLanguage = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderProvider() {
  await act(async () => {
    root.render(createElement(LangProvider, null, createElement(LanguageProbe)));
  });
}

describe('LangProvider', () => {
  it('restores a supported stored language and its writing direction', async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'ar');

    await renderProvider();

    expect(currentLanguage?.lang).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('falls back to English when the stored value is unsupported', async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'en-US');

    await renderProvider();

    expect(currentLanguage?.lang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('persists language changes and exposes the matching app translation', async () => {
    await renderProvider();

    await act(async () => currentLanguage?.setLang('ja'));

    expect(currentLanguage?.lang).toBe('ja');
    expect(currentLanguage?.t.newNote).toBe('新しいメモ');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
