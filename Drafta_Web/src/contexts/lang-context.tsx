"use client";

import * as React from 'react';
import { Lang, AppT, appTranslations } from '@/app/translations';

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

export function useLang(): LangContextValue {
  return React.useContext(LangContext);
}
