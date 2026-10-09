import { version } from '../../package.json';

// The package version is the single source for the public version number.
export const PUBLIC_VERSION = version;
export const RELEASES = [
  { version: '0.6.0', date: '2026-10-09', copyKey: 'release060' },
  { version: '0.5.1', date: '2026-09-30', copyKey: 'release051' },
  { version: '0.5.0', date: '2026-09-30', copyKey: 'release050' },
  { version: '0.4.0', date: '2026-09-30', copyKey: 'release040' },
  { version: '0.3.0', date: '2026-09-28', copyKey: 'release030' },
  { version: '0.2.1', date: '2026-09-28', copyKey: 'release021' },
  { version: '0.2.0', date: '2026-09-28', copyKey: 'release020' },
  { version: '0.1.1', date: '2026-09-28', copyKey: 'release011' },
  { version: '0.1.0', date: '2026-09-28', copyKey: 'releaseSummary' },
] as const;
// Selected implementation dates from Git, not retroactive release numbers.
export const IMPLEMENTATION_HISTORY = [
  { date: '2026-09-28', copyKey: 'historyLatest' },
  { date: '2026-09-17', copyKey: 'historyPins' },
  { date: '2026-09-16', copyKey: 'historyCreation' },
  { date: '2026-09-15', copyKey: 'historyInput' },
  { date: '2026-09-15', copyKey: 'historyLanguages' },
  { date: '2026-01-20', copyKey: 'historyRich' },
] as const;
