"use client";

import * as React from 'react';
import {
  type Lang,
  type AppT,
  appTranslations,
  isLang,
  LANG_DIRECTION,
  LANG_STORAGE_KEY,
} from '@/app/translations';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: AppT;
}

export const LangContext = React.createContext<LangContextValue>({
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

  const setLang = React.useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    syncDocumentLanguage(nextLang);

    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // Language selection still works when browser storage is unavailable.
    }
  }, []);

  React.useEffect(() => {
    let storedLang: string | null = null;

    try {
      storedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      // Keep the server-safe English default when browser storage is unavailable.
    }

    const initialLang = isLang(storedLang) ? storedLang : 'en';
    setLangState(initialLang);
    syncDocumentLanguage(initialLang);
  }, []);

  const value = React.useMemo(
    () => ({ lang, setLang, t: appTranslations[lang] }),
    [lang, setLang],
  );

  return React.createElement(LangContext.Provider, { value }, children);
}

export function useLang(): LangContextValue {
  return React.useContext(LangContext);
}
