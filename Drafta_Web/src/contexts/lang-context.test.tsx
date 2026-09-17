/**
 * @vitest-environment jsdom
 */

import { act, createElement, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LANG_STORAGE_KEY } from '@/app/languages';
import { LangProvider, useLang } from './lang-context';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let currentLanguage: ReturnType<typeof useLang> | null = null;

function LanguageProbe() {
  const language = useLang();
  useLayoutEffect(() => { currentLanguage = language; }, [language]);
  return null;
}

beforeEach(() => {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US']);
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
  vi.restoreAllMocks();
});

async function renderProvider() {
  await act(async () => {
    root.render(createElement(LangProvider, null, createElement(LanguageProbe)));
  });
}

describe('LangProvider', () => {
  it('detects browser language without persisting an automatic choice', async () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['ja-JP']);
    await renderProvider();
    expect(currentLanguage?.lang).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
  });

  it('uses browser preferences when storage is inaccessible', async () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['ar-SA']);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await renderProvider();
    expect(currentLanguage?.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('ignores invalid saved values in favor of browser preferences', async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'unsupported');
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['ja-JP']);
    await renderProvider();
    expect(currentLanguage?.lang).toBe('ja');
  });

  it('falls back to navigator.language when the preference list is empty', async () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([]);
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP');
    await renderProvider();
    expect(currentLanguage?.lang).toBe('ja');
  });
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
    expect(currentLanguage?.t.untitledTray).toBe('無題のトレイ');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
