import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { a11yCopy, withName } from './a11y-copy';

const namedKeys = ['restoreMemo', 'deleteMemoForever', 'closeTab'] as const;

describe('accessible labels for icon-only controls', () => {
  it('fills every label in all 11 languages', () => {
    expect(LANGS).toHaveLength(11);
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(a11yCopy[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe('');
        expect(value.includes('{name}'), `${lang}.${key}`).toBe((namedKeys as readonly string[]).includes(key));
      }
    }
  });

  it('translates every label away from English outside en', () => {
    for (const lang of LANGS.filter(code => code !== 'en')) {
      for (const [key, value] of Object.entries(a11yCopy[lang])) {
        expect(value, `${lang}.${key}`).not.toBe(a11yCopy.en[key as keyof typeof a11yCopy.en]);
      }
    }
  });

  it('inserts the item name into named labels', () => {
    expect(withName(a11yCopy.ja.restoreMemo, '買い物')).toBe('買い物を復元');
    expect(withName(a11yCopy.en.deleteMemoForever, 'Groceries')).toBe('Delete Groceries forever');
    expect(withName(a11yCopy.en.restoreMemo, 'Price $& $1')).toBe('Restore Price $& $1');
  });

  it('leaves no hard-coded English aria-label or title in the app UI', () => {
    for (const file of ['src/components/workspace-view.tsx', 'src/components/playground.tsx', 'src/components/editor-tabs.tsx', 'src/components/open-tabs-list.tsx', 'src/components/app-bar.tsx', 'src/components/mobile-nav.tsx', 'src/components/memo-actions.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/(?:aria-label|title)="(?!Drafta")[^"]*[A-Za-z]/);
      expect(source, file).not.toMatch(/(?:aria-label|title)=\{`[A-Z]/);
    }
  });
});
