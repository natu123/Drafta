import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { importCopy } from './import-copy';
import { transferCopy } from './transfer-copy';

const placeholders = (value: unknown): unknown => typeof value === 'string'
  ? [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  : Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, placeholders(item)]));

describe('import copy', () => {
  it('uses the same placeholders as English in every language', () => {
    for (const lang of LANGS) expect(placeholders(importCopy[lang]), lang).toEqual(placeholders(importCopy.en));
  });
});

describe('transfer copy', () => {
  it('uses the same placeholders as English in every language and fills every string', () => {
    for (const lang of LANGS) {
      expect(placeholders(transferCopy[lang]), lang).toEqual(placeholders(transferCopy.en));
      expect(JSON.stringify(transferCopy[lang]), lang).not.toContain('""');
    }
  });
});
