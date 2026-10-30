'use client';

import * as React from 'react';
import { CalendarClock } from 'lucide-react';
import type { Lang } from '@/app/languages';
import { cn } from '@/lib/utils';

/**
 * A local date and time (`2026-10-30T11:12`) as five small number fields (specs/25, 2.3; Gles's choice
 * of 2026-10-30). A click anywhere in the box, between the fields included, goes to the nearest field,
 * which the browser's own date and time field does not do. The button opens the browser's picker.
 * `onChange` gets '' while the parts do not make a real date and time.
 */
const PARTS = [
  { key: 'year', size: 4, min: 1970, max: 9999 },
  { key: 'month', size: 2, min: 1, max: 12 },
  { key: 'day', size: 2, min: 1, max: 31 },
  { key: 'hour', size: 2, min: 0, max: 23 },
  { key: 'minute', size: 2, min: 0, max: 59 },
] as const;
type Parts = [string, string, string, string, string];

const pad = (value: number, size: number) => String(value).padStart(size, '0');
const split = (value: string): Parts => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  return match ? [match[1], match[2], match[3], match[4], match[5]] : ['', '', '', '', ''];
};
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
function join(parts: Parts): string {
  const [year, month, day, hour, minute] = parts.map(Number);
  if (parts.some((part, index) => part.length === 0 || part.length > PARTS[index].size)) return '';
  if (parts.some((part, index) => Number(part) < PARTS[index].min || Number(part) > PARTS[index].max)) return '';
  if (day > daysIn(year, month)) return '';
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}T${pad(hour, 2)}:${pad(minute, 2)}`;
}

export function DateTimeFields({ value, onChange, lang, pickLabel }: { value: string; onChange: (value: string) => void; lang: Lang; pickLabel: string }) {
  const [parts, setParts] = React.useState<Parts>(() => split(value));
  // The latest parts: moving to the next field blurs this one before React renders the keystroke.
  const latest = React.useRef(parts);
  const fields = React.useRef<(HTMLInputElement | null)[]>([]);
  const picker = React.useRef<HTMLInputElement>(null);
  const names = React.useMemo(() => {
    try {
      const display = new Intl.DisplayNames(lang, { type: 'dateTimeField' });
      return PARTS.map(part => display.of(part.key) ?? part.key);
    } catch { return PARTS.map(part => part.key); }
  }, [lang]);

  const update = (next: Parts) => { latest.current = next; setParts(next); onChange(join(next)); };
  const focus = (index: number) => {
    const field = fields.current[Math.max(0, Math.min(PARTS.length - 1, index))];
    field?.focus(); field?.select();
  };
  const type = (index: number, text: string) => {
    const digits = text.replace(/\D/g, '').slice(-PARTS[index].size);
    const next = [...latest.current] as Parts; next[index] = digits;
    update(next);
    // A full field, or a first digit that cannot start a two-digit value, moves on.
    const size = PARTS[index].size;
    if (digits.length === size || (size === 2 && digits.length === 1 && Number(digits) * 10 > PARTS[index].max)) focus(index + 1);
  };
  const step = (index: number, by: number) => {
    const { min, max, size } = PARTS[index];
    const current = latest.current[index] === '' ? (by > 0 ? min - 1 : max + 1) : Number(latest.current[index]);
    const next = [...latest.current] as Parts;
    next[index] = pad(current + by > max ? min : current + by < min ? max : current + by, size);
    update(next);
  };
  const key = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    const field = event.currentTarget;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); step(index, event.key === 'ArrowUp' ? 1 : -1); }
    else if (event.key === 'ArrowRight' && field.selectionStart === field.value.length) { event.preventDefault(); focus(index + 1); }
    else if (event.key === 'ArrowLeft' && field.selectionEnd === 0) { event.preventDefault(); focus(index - 1); }
    else if (event.key === 'Backspace' && field.value === '' && index > 0) { event.preventDefault(); focus(index - 1); }
    else if (['-', ':', '/', ' ', '.'].includes(event.key)) { event.preventDefault(); focus(index + 1); }
  };
  // Finished fields keep their leading zeros.
  const tidy = (index: number) => {
    const part = latest.current[index];
    if (part === '' || part.length >= PARTS[index].size) return;
    const next = [...latest.current] as Parts; next[index] = pad(Number(part), PARTS[index].size);
    update(next);
  };
  // A press outside the fields goes to the field whose middle is nearest.
  const nearest = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement || (event.target as Element).closest('button')) return;
    event.preventDefault();
    let best = 0, distance = Infinity;
    fields.current.forEach((field, index) => {
      if (!field) return;
      const box = field.getBoundingClientRect();
      const away = Math.abs(event.clientX - (box.left + box.width / 2));
      if (away < distance) { distance = away; best = index; }
    });
    focus(best);
  };
  const openPicker = () => {
    const input = picker.current;
    if (!input) return;
    input.value = join(latest.current);
    try { input.showPicker(); } catch { input.focus(); }
  };

  return (
    <div className="date-time-fields relative flex w-full cursor-text items-center rounded-md border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring" onMouseDown={nearest}>
      {PARTS.map((part, index) => (
        <React.Fragment key={part.key}>
          {index === 1 || index === 2 ? <span aria-hidden="true">-</span> : index === 3 ? <span aria-hidden="true" className="w-3" /> : index === 4 ? <span aria-hidden="true">:</span> : null}
          <input ref={element => { fields.current[index] = element; }} value={parts[index]} aria-label={names[index]} inputMode="numeric" autoComplete="off"
            placeholder={part.key === 'year' ? 'yyyy' : '––'} size={part.size}
            className={cn('bg-transparent text-center tabular-nums outline-none focus:bg-accent focus:text-accent-foreground rounded-sm', part.size === 4 ? 'w-[4.5ch]' : 'w-[2.5ch]')}
            onFocus={event => event.currentTarget.select()}
            // Like a date field: a press takes the whole field, so typing replaces it even when it already has focus.
            onMouseDown={event => { event.preventDefault(); focus(index); }} onChange={event => type(index, event.target.value)} onKeyDown={event => key(index, event)} onBlur={() => tidy(index)} />
        </React.Fragment>
      ))}
      <button type="button" aria-label={pickLabel} className="ml-auto rounded-sm p-0.5 text-muted-foreground hover:text-foreground" onClick={openPicker}><CalendarClock className="size-4" /></button>
      {/* The browser's own picker, opened by the button; what it picks fills the fields. */}
      <input ref={picker} type="datetime-local" tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
        onChange={event => { if (event.target.value) update(split(event.target.value)); }} />
    </div>
  );
}
