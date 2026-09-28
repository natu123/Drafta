import { describe, expect, it } from 'vitest';
import { LANGS } from '@/app/languages';
import { releaseCopy } from './release-copy';
import { HISTORY_DATES, PUBLIC_VERSION, RELEASES } from './release-info';
import { siteMetadata } from './site-metadata';

describe('public releases', () => {
  it('keeps the latest release aligned with the package version', () => {
    expect(RELEASES[0].version).toBe(PUBLIC_VERSION);
    expect(PUBLIC_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(new Set(RELEASES.map(release => release.version)).size).toBe(RELEASES.length);
  });
  it('provides every release and roadmap field in all supported languages', () => {
    expect(Object.keys(releaseCopy).sort()).toEqual([...LANGS].sort());
    for (const lang of LANGS) {
      expect(Object.keys(releaseCopy[lang])).toEqual(Object.keys(releaseCopy.en));
      for (const value of Object.values(releaseCopy[lang])) expect(value.trim().length).toBeGreaterThan(0);
      for (const release of RELEASES) expect(releaseCopy[lang][release.copyKey]).toBeTruthy();
    }
    expect(HISTORY_DATES).toEqual(['2026-09-28', '2026-09-17', '2026-09-16']);
  });
  it('gives updates their own canonical URL', () => {
    expect(siteMetadata('/updates/').alternates?.canonical).toBe('/updates/');
  });
});
