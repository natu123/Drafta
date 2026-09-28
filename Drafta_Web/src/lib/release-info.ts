import { version } from '../../package.json';

// The package version is the single source for the public version number.
export const PUBLIC_VERSION = version;
export const RELEASES = [{ version: '0.1.0', date: '2026-09-28', copyKey: 'releaseSummary' }] as const;
// Selected implementation dates from Git, not retroactive release numbers.
export const HISTORY_DATES = ['2026-09-28', '2026-09-17', '2026-09-16'] as const;
