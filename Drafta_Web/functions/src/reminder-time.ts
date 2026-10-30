/**
 * When a reminder rings (specs/25_reminders.md, 2.1). Its owner picks a local date and time
 * (`wallTime`, `2026-10-30T18:00`) in their time zone; each ring is that time of day on the days its
 * repeat allows, as an absolute time. A time that does not exist on a day (skipped when daylight
 * saving starts) moves forward by the skipped length, as calendars do (2:30 becomes 3:30); a time that
 * happens twice (repeated when it ends) rings the first time.
 */
export const REPEATS = ['none', 'daily', 'weekdays', 'weekly', 'monthly'] as const;
export type Repeat = (typeof REPEATS)[number];
export const isRepeat = (value: unknown): value is Repeat => REPEATS.includes(value as Repeat);

const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const MINUTE = 60_000;
const DAY = 86_400_000;
/** No reminder looks further ahead than this for its next ring. */
const SEARCH_DAYS = 400;

type Wall = { year: number; month: number; day: number; hour: number; minute: number };

export function parseWallTime(text: string): Wall | null {
  const match = WALL_TIME.exec(text);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month) || hour > 23 || minute > 59) return null;
  return { year, month, day, hour, minute };
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; } catch { return false; }
}

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const formats = new Map<string, Intl.DateTimeFormat>();
function format(timeZone: string) {
  let value = formats.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    formats.set(timeZone, value);
  }
  return value;
}
/** The local date and time at an instant. */
function wallAt(time: number, timeZone: string): Wall {
  const parts = Object.fromEntries(format(timeZone).formatToParts(new Date(time)).map(part => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute) };
}
const naive = (wall: Wall) => Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
const offsetAt = (time: number, timeZone: string) => naive(wallAt(time, timeZone)) - Math.floor(time / MINUTE) * MINUTE;

/** The instant of a local date and time (see the rule for skipped and repeated times above). */
export function instantOf(wall: Wall, timeZone: string): number {
  const local = naive(wall);
  const candidates = [...new Set([local - offsetAt(local - DAY / 2, timeZone), local - offsetAt(local + DAY / 2, timeZone)])];
  const exact = candidates.filter(time => naive(wallAt(time, timeZone)) === local);
  return exact.length > 0 ? Math.min(...exact) : Math.max(...candidates);
}

function ringsOn(repeat: Repeat, start: Wall, date: { year: number; month: number; day: number }): boolean {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  switch (repeat) {
    case 'none': return date.year === start.year && date.month === start.month && date.day === start.day;
    case 'daily': return true;
    case 'weekdays': return weekday >= 1 && weekday <= 5;
    case 'weekly': return weekday === new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay();
    // The same day each month; a month without it rings on its last day.
    case 'monthly': return date.day === Math.min(start.day, daysIn(date.year, date.month));
  }
}

/**
 * The first ring strictly after `after` (milliseconds), or null when none is left. Rings start from
 * the chosen date, never before it.
 */
export function nextRing(wallTime: string, timeZone: string, repeat: Repeat, after: number): number | null {
  const start = parseWallTime(wallTime);
  if (!start || !isTimeZone(timeZone) || !isRepeat(repeat)) return null;
  // Begin at the chosen date or the day before `after` in local time, whichever is later.
  const from = wallAt(after - DAY, timeZone);
  let cursor = Math.max(Date.UTC(start.year, start.month - 1, start.day), Date.UTC(from.year, from.month - 1, from.day));
  for (let step = 0; step < SEARCH_DAYS; step++, cursor += DAY) {
    const day = new Date(cursor);
    const date = { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() };
    if (!ringsOn(repeat, start, date)) continue;
    const time = instantOf({ ...date, hour: start.hour, minute: start.minute }, timeZone);
    if (time > after) return time;
    if (repeat === 'none') return null;
  }
  return null;
}
