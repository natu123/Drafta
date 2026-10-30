import { describe, expect, it } from 'vitest';
import { instantOf, isTimeZone, nextRing, parseWallTime } from './reminder-time.js';

const at = (iso: string) => Date.parse(iso);
const iso = (time: number | null) => time === null ? null : new Date(time).toISOString();

describe('reminder rings (specs/25, 2.1)', () => {
  it('reads only real local dates and times', () => {
    expect(parseWallTime('2026-10-30T18:00')).toEqual({ year: 2026, month: 10, day: 30, hour: 18, minute: 0 });
    for (const bad of ['2026-02-29T09:00', '2026-13-01T09:00', '2026-10-30T24:00', '2026-10-30 18:00', '2026-10-30T18:00:00']) expect(parseWallTime(bad)).toBeNull();
    expect(isTimeZone('Asia/Tokyo')).toBe(true);
    expect(isTimeZone('Mars/Base')).toBe(false);
  });

  it('rings once at the chosen time, and not again', () => {
    expect(iso(nextRing('2026-10-30T18:00', 'Asia/Tokyo', 'none', at('2026-10-30T00:00Z')))).toBe('2026-10-30T09:00:00.000Z');
    expect(nextRing('2026-10-30T18:00', 'Asia/Tokyo', 'none', at('2026-10-30T09:00Z'))).toBeNull();
  });

  it('repeats daily, on weekdays, weekly and monthly from the chosen date', () => {
    const fri = '2026-10-30T09:00'; // a Friday
    expect(iso(nextRing(fri, 'Asia/Tokyo', 'daily', at('2026-10-30T00:00Z')))).toBe('2026-10-31T00:00:00.000Z');
    expect(iso(nextRing(fri, 'Asia/Tokyo', 'weekdays', at('2026-10-30T00:00Z')))).toBe('2026-11-02T00:00:00.000Z'); // Monday
    expect(iso(nextRing(fri, 'Asia/Tokyo', 'weekly', at('2026-10-30T00:00Z')))).toBe('2026-11-06T00:00:00.000Z');
    expect(iso(nextRing(fri, 'Asia/Tokyo', 'monthly', at('2026-10-30T00:00Z')))).toBe('2026-11-30T00:00:00.000Z');
    // Never before the chosen date, even when asked from long before it.
    expect(iso(nextRing(fri, 'Asia/Tokyo', 'daily', at('2026-01-01T00:00Z')))).toBe('2026-10-30T00:00:00.000Z');
  });

  it('rings monthly on the last day of a month without the chosen day', () => {
    const start = '2027-01-31T08:00';
    expect(iso(nextRing(start, 'Asia/Tokyo', 'monthly', at('2027-01-31T00:00Z')))).toBe('2027-02-27T23:00:00.000Z'); // Feb 28, 08:00 JST
    expect(iso(nextRing(start, 'Asia/Tokyo', 'monthly', at('2027-02-28T00:00Z')))).toBe('2027-03-30T23:00:00.000Z'); // back to the 31st
    expect(iso(nextRing('2028-01-31T08:00', 'Asia/Tokyo', 'monthly', at('2028-01-31T00:00Z')))).toBe('2028-02-28T23:00:00.000Z'); // leap year: Feb 29
  });

  it('keeps the local time across daylight saving', () => {
    // New York: 9:00 is 13:00Z in summer and 14:00Z in winter.
    expect(iso(nextRing('2026-10-30T09:00', 'America/New_York', 'daily', at('2026-10-31T14:00Z')))).toBe('2026-11-01T14:00:00.000Z');
    expect(iso(nextRing('2026-10-30T09:00', 'America/New_York', 'daily', at('2026-10-30T12:00Z')))).toBe('2026-10-30T13:00:00.000Z');
  });

  it('moves a skipped time forward and rings a repeated time once', () => {
    // 2027-03-14 02:30 does not exist in New York; it rings at 03:30 EDT.
    expect(iso(instantOf({ year: 2027, month: 3, day: 14, hour: 2, minute: 30 }, 'America/New_York'))).toBe('2027-03-14T07:30:00.000Z');
    // 2026-11-01 01:30 happens twice; the first (EDT) is used.
    expect(iso(instantOf({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, 'America/New_York'))).toBe('2026-11-01T05:30:00.000Z');
    // A daily 01:30 rings once that night, then the next night.
    expect(iso(nextRing('2026-10-31T01:30', 'America/New_York', 'daily', at('2026-11-01T05:30Z')))).toBe('2026-11-02T06:30:00.000Z');
  });

  it('refuses what it cannot read', () => {
    expect(nextRing('tomorrow', 'Asia/Tokyo', 'daily', 0)).toBeNull();
    expect(nextRing('2026-10-30T09:00', 'Mars/Base', 'daily', 0)).toBeNull();
    expect(nextRing('2026-10-30T09:00', 'Asia/Tokyo', 'hourly' as never, 0)).toBeNull();
  });
});
