import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { cloudCopy } from './cloud-copy';

describe('account and persistence translations', () => {
  it.each(LANGS)('provides all labels and safety confirmations in %s', lang => {
    const copy = cloudCopy[lang];
    expect(Object.keys(copy)).toEqual(Object.keys(cloudCopy.en));
    expect(Object.keys(copy.status)).toEqual(Object.keys(cloudCopy.en.status));
    for (const text of [...Object.values(copy).filter(value => typeof value === 'string'), ...Object.values(copy.status)]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});
