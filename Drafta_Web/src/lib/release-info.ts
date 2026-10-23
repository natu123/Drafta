import { version } from '../../package.json';

// The package version is the single source for the public version number.
export const PUBLIC_VERSION = version;
export const RELEASES = [
  { version: '0.9.0', date: '2026-10-23', copyKey: 'release090' },
  { version: '0.8.6', date: '2026-10-23', copyKey: 'release086' },
  { version: '0.8.5', date: '2026-10-22', copyKey: 'release085' },
  { version: '0.8.4', date: '2026-10-22', copyKey: 'release084' },
  { version: '0.8.3', date: '2026-10-21', copyKey: 'release083' },
  { version: '0.8.2', date: '2026-10-21', copyKey: 'release082' },
  { version: '0.8.1', date: '2026-10-21', copyKey: 'release081' },
  { version: '0.8.0', date: '2026-10-21', copyKey: 'release080' },
  { version: '0.7.3', date: '2026-10-21', copyKey: 'release073' },
  { version: '0.7.2', date: '2026-10-21', copyKey: 'release072' },
  { version: '0.7.1', date: '2026-10-21', copyKey: 'release071' },
  { version: '0.7.0', date: '2026-10-21', copyKey: 'release070' },
  { version: '0.6.13', date: '2026-10-21', copyKey: 'release0613' },
  { version: '0.6.12', date: '2026-10-21', copyKey: 'release0612' },
  { version: '0.6.11', date: '2026-10-20', copyKey: 'release0611' },
  { version: '0.6.10', date: '2026-10-20', copyKey: 'release0610' },
  { version: '0.6.9', date: '2026-10-20', copyKey: 'release069' },
  { version: '0.6.8', date: '2026-10-20', copyKey: 'release068' },
  { version: '0.6.7', date: '2026-10-20', copyKey: 'release067' },
  { version: '0.6.6', date: '2026-10-20', copyKey: 'release066' },
  { version: '0.6.5', date: '2026-10-20', copyKey: 'release065' },
  { version: '0.6.4', date: '2026-10-20', copyKey: 'release064' },
  { version: '0.6.3', date: '2026-10-20', copyKey: 'release063' },
  { version: '0.6.2', date: '2026-10-20', copyKey: 'release062' },
  { version: '0.6.1', date: '2026-10-09', copyKey: 'release061' },
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
