'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { useReminders } from '@/contexts/reminder-context';
import { proCopy } from '@/lib/pro-copy';
import { reminderCopy, ringLabel } from '@/lib/reminder-copy';
import { REPEATS, type Repeat } from '@/lib/reminder-time';
import { PastReminderError } from '@/lib/reminders-client';
import type { PushState } from '@/lib/push-client';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/** A memo with a reminder is marked in this color on the toolbar and in the list (specs/25, 2.3). */
export const REMINDER_CLASS = 'text-amber-600 dark:text-amber-400';

// The next full hour, as the date and time input writes it.
function nextHour(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

/**
 * The bell next to share in the memo toolbar, with its popover (specs/25, 2.3; Gles's choices of
 * 2026-10-29 and 2026-10-30): a date and time input and the repeat, or the reminder that is set
 * with change and remove. The device's permission is asked when a reminder is first set.
 */
export function ReminderAction({ noteId }: { noteId: string }) {
  const { lang } = useLang();
  const control = useReminders();
  const copy = reminderCopy[lang];
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [wallTime, setWallTime] = React.useState('');
  const [repeat, setRepeat] = React.useState<Repeat>('none');
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<'past' | 'failed' | null>(null);
  const [device, setDevice] = React.useState<PushState | null>(null);
  if (!control) return null;
  const reminder = control.all.get(noteId) ?? null;
  const ringing = reminder?.nextAt != null;
  const label = ringing ? copy.set : copy.remind;
  const push = device ?? control.push;
  const showForm = control.isPro && (editing || !ringing);

  const change = (next: boolean) => {
    setOpen(next);
    if (next) {
      setEditing(false); setProblem(null); setDevice(null);
      setWallTime(reminder?.wallTime ?? nextHour()); setRepeat(reminder?.repeat ?? 'none');
    }
  };
  const openPro = () => { setOpen(false); control.openPro(); };
  const save = async () => {
    setBusy(true); setProblem(null);
    try {
      setDevice(await control.set(noteId, wallTime, repeat));
      setEditing(false);
    } catch (error) {
      setProblem(error instanceof PastReminderError ? 'past' : 'failed');
    } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setProblem(null);
    try { await control.remove(noteId); setEditing(false); } catch { setProblem('failed'); } finally { setBusy(false); }
  };
  const deviceNote = push === 'denied' ? copy.denied : push === 'install' ? copy.install : push === 'unsupported' ? copy.unsupported : push === 'error' ? copy.registerFailed : null;

  return (
    <Popover open={open} onOpenChange={change}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className={cn('memo-reminder size-10', ringing && REMINDER_CLASS)} aria-label={label}><Bell className={ringing ? 'fill-current' : ''} /></Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 space-y-3 text-sm">
        <p className={cn('flex items-center gap-1.5 font-medium', ringing && REMINDER_CLASS)}><Bell className="size-4" />{ringing ? copy.set : copy.remind}</p>
        {ringing && !showForm && (
          <>
            <p>{ringLabel(reminder.nextAt!, lang)}{reminder.repeat !== 'none' && <span className="text-muted-foreground"> · {copy.repeats[reminder.repeat]}</span>}</p>
            {!control.isPro && <p className="text-xs text-muted-foreground">{copy.proOnly}</p>}
            <div className="flex gap-2">
              {control.isPro
                ? <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(true)}>{copy.change}</Button>
                : <Button size="sm" variant="outline" className="flex-1" onClick={openPro}>{proCopy[lang].upgrade}</Button>}
              <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:text-destructive" disabled={busy} onClick={() => { void remove(); }}>{copy.remove}</Button>
            </div>
          </>
        )}
        {reminder && !ringing && <p className="text-xs text-muted-foreground">{copy.done}</p>}
        {showForm && (
          <>
            <p className="text-xs text-muted-foreground">{copy.offer}</p>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">{copy.when}</span>
              <input type="datetime-local" value={wallTime} onChange={event => setWallTime(event.target.value)} required
                className="w-full rounded-md border bg-background px-2 py-1.5" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">{copy.repeat}</span>
              <select value={repeat} onChange={event => setRepeat(event.target.value as Repeat)} className="w-full rounded-md border bg-background px-2 py-1.5">
                {REPEATS.map(value => <option key={value} value={value}>{copy.repeats[value]}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={busy || !wallTime} onClick={() => { void save(); }}>{busy ? copy.saving : copy.save}</Button>
              {reminder && <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:text-destructive" disabled={busy} onClick={() => { void remove(); }}>{copy.remove}</Button>}
            </div>
          </>
        )}
        {!control.isPro && !reminder && (
          <>
            <p className="text-xs text-muted-foreground">{copy.offer} {copy.proOnly}</p>
            <Button size="sm" className="w-full" onClick={openPro}>{proCopy[lang].upgrade}</Button>
          </>
        )}
        {(reminder || device) && deviceNote && <p role="status" className="text-xs text-destructive">{deviceNote}</p>}
        {problem && <p role="alert" className="text-xs text-destructive">{problem === 'past' ? copy.past : copy.failed}</p>}
      </PopoverContent>
    </Popover>
  );
}

/** The bell and ring time on a memo's card in the list. */
export function ReminderMark({ noteId }: { noteId: string }) {
  const { lang } = useLang();
  const control = useReminders();
  const nextAt = control?.all.get(noteId)?.nextAt;
  if (nextAt == null) return null;
  return (
    <span className={cn('memo-reminder-mark mr-2 inline-flex shrink-0 items-center gap-0.5 text-[10px]', REMINDER_CLASS)} aria-label={`${reminderCopy[lang].set} ${ringLabel(nextAt, lang)}`}>
      <Bell className="size-3" aria-hidden="true" />{ringLabel(nextAt, lang, true)}
    </span>
  );
}
