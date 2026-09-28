"use client";

import * as React from 'react';
import { detectBrowserLanguage } from '@/app/languages';
import {
  type Lang,
  type AppT,
  appTranslations,
  isLang,
  LANG_DIRECTION,
  LANG_STORAGE_KEY,
} from '@/app/translations';

interface LangContextValue {
  languagePreference: Lang | null;
  restoreLanguage: (language: Lang | null) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: AppT;
}

export const LangContext = React.createContext<LangContextValue>({
  languagePreference: null,
  restoreLanguage: () => {},
  lang: 'en',
  setLang: () => {},
  t: appTranslations['en'],
});

function syncDocumentLanguage(lang: Lang): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = LANG_DIRECTION[lang];
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>('en');
  const [languagePreference, setLanguagePreference] = React.useState<Lang | null>(null);

  const setLang = React.useCallback((nextLang: Lang) => {
    setLanguagePreference(nextLang);
    setLangState(nextLang);
    syncDocumentLanguage(nextLang);

    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // Language selection still works when browser storage is unavailable.
    }
  }, []);

  const restoreLanguage = React.useCallback((preference: Lang | null) => {
    const preferences = navigator.languages?.length ? navigator.languages : [navigator.language];
    const next = preference ?? detectBrowserLanguage(preferences);
    setLanguagePreference(preference);
    setLangState(next);
    syncDocumentLanguage(next);
    try {
      if (preference) window.localStorage.setItem(LANG_STORAGE_KEY, preference);
      else window.localStorage.removeItem(LANG_STORAGE_KEY);
    } catch { /* The in-memory preference still applies. */ }
  }, []);

  React.useLayoutEffect(() => {
    let storedLang: string | null = null;

    try {
      storedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      // Browser-language detection still works when storage is unavailable.
    }

    const preferences = navigator.languages?.length ? navigator.languages : [navigator.language];
    const initialLang = isLang(storedLang) ? storedLang : detectBrowserLanguage(preferences);
    // The server cannot read browser storage. Apply the initial locale before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLangState(initialLang);
    setLanguagePreference(isLang(storedLang) ? storedLang : null);
    syncDocumentLanguage(initialLang);
  }, []);

  const value = React.useMemo(
    () => ({ lang, setLang, languagePreference, restoreLanguage, t: appTranslations[lang] }),
    [lang, setLang, languagePreference, restoreLanguage],
  );

  return React.createElement(LangContext.Provider, { value }, children);
}

export function useLang(): LangContextValue {
  return React.useContext(LangContext);
}
