export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', shortLabel: 'EN', direction: 'ltr' },
  { code: 'ja', label: '日本語', shortLabel: 'JA', direction: 'ltr' },
  { code: 'zh-CN', label: '中文', shortLabel: 'ZH', direction: 'ltr' },
  { code: 'ko', label: '한국어', shortLabel: 'KO', direction: 'ltr' },
  { code: 'hi', label: 'हिन्दी', shortLabel: 'HI', direction: 'ltr' },
  { code: 'ar', label: 'العربية', shortLabel: 'AR', direction: 'rtl' },
  { code: 'ru', label: 'Русский', shortLabel: 'RU', direction: 'ltr' },
  { code: 'id', label: 'Indonesia', shortLabel: 'ID', direction: 'ltr' },
  { code: 'es', label: 'Español', shortLabel: 'ES', direction: 'ltr' },
  { code: 'fr', label: 'Français', shortLabel: 'FR', direction: 'ltr' },
  { code: 'pt-BR', label: 'Português', shortLabel: 'PT', direction: 'ltr' },
] as const;

export type Lang = (typeof LANGUAGE_OPTIONS)[number]['code'];
export type LanguageDirection = (typeof LANGUAGE_OPTIONS)[number]['direction'];

// Visual cues only; languages are not restricted to these countries.
export const LANGUAGE_FLAGS: Record<Lang, string> = {
  en: 'us', ja: 'jp', 'zh-CN': 'cn', ko: 'kr', hi: 'in', ar: 'sa',
  ru: 'ru', id: 'id', es: 'es', fr: 'fr', 'pt-BR': 'br',
};

export const LANG_STORAGE_KEY = 'drafta-language';

export const LANGS: readonly Lang[] = LANGUAGE_OPTIONS.map(({ code }) => code);

export const LANG_LABEL = Object.fromEntries(
  LANGUAGE_OPTIONS.map(({ code, label }) => [code, label]),
) as Record<Lang, string>;

export const LANG_SHORT = Object.fromEntries(
  LANGUAGE_OPTIONS.map(({ code, shortLabel }) => [code, shortLabel]),
) as Record<Lang, string>;

export const LANG_DIRECTION = Object.fromEntries(
  LANGUAGE_OPTIONS.map(({ code, direction }) => [code, direction]),
) as Record<Lang, LanguageDirection>;

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && LANGS.includes(value as Lang);
}

export function detectBrowserLanguage(preferences: readonly string[]): Lang {
  for (const preference of preferences) {
    try {
      const locale = new Intl.Locale(preference);
      const exact = LANGS.find(code => code.toLowerCase() === locale.baseName.toLowerCase());
      if (exact) return exact;
      // Only Simplified Chinese translations are available; do not substitute for Traditional.
      if (locale.language === 'zh' && locale.maximize().script !== 'Hans') continue;
      const match = LANGS.find(code => code.split('-')[0] === locale.language);
      if (match) return match;
    } catch {
      // Ignore malformed preferences and continue through the priority list.
    }
  }
  return 'en';
}
