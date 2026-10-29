'use client';

import * as React from 'react';
import { Link2 } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { useShare } from '@/contexts/share-context';
import { shareActionCopy } from '@/lib/share-copy';
import { proCopy } from '@/lib/pro-copy';
import { shareUrl } from '@/lib/share-links';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/** Shared memos are marked in this color on the toolbar and in the list (specs/24, 4). */
export const SHARED_CLASS = 'text-sky-600 dark:text-sky-400';

/**
 * The share button next to history in the memo toolbar, with its popover below it (specs/24, 4;
 * Gles's choices of 2026-10-29): create a link, copy or open it, stop sharing. A free account
 * learns what sharing is and goes on to Pro.
 */
export function ShareAction({ noteId }: { noteId: string }) {
  const { lang } = useLang();
  const control = useShare();
  const copy = shareActionCopy[lang];
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  if (!control) return null;
  const token = control.shared.get(noteId) ?? null;
  const url = token ? shareUrl(token) : null;
  const label = token ? copy.shared : copy.share;
  // Pro's dialog takes over from the popover.
  const openPro = () => { setOpen(false); control.openPro(); };
  const run = async (job: () => Promise<unknown>) => {
    setBusy(true); setFailed(false);
    try { await job(); } catch { setFailed(true); } finally { setBusy(false); }
  };
  const copyLink = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setFailed(true); }
  };
  return (
    <Popover open={open} onOpenChange={next => { setOpen(next); if (!next) { setFailed(false); setCopied(false); } }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className={cn('memo-share size-10', token && SHARED_CLASS)} aria-label={label}><Link2 /></Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 space-y-3 text-sm">
        {url ? (
          <>
            <p className={cn('flex items-center gap-1.5 font-medium', SHARED_CLASS)}><Link2 className="size-4" />{copy.shared}</p>
            <input readOnly value={url} aria-label={copy.link} onFocus={event => event.currentTarget.select()}
              className="w-full truncate rounded-md border bg-muted/40 px-2 py-1.5 text-xs" />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => { void copyLink(); }}>{copied ? copy.copied : copy.copy}</Button>
              <Button size="sm" variant="outline" className="flex-1" asChild><a href={url} target="_blank" rel="noopener noreferrer">{copy.open}</a></Button>
            </div>
            <p className="text-xs text-muted-foreground">{control.isPro ? copy.follows : copy.paused}</p>
            {!control.isPro && <Button size="sm" variant="outline" className="w-full" onClick={openPro}>{proCopy[lang].upgrade}</Button>}
            <Button size="sm" variant="ghost" className="w-full text-destructive hover:text-destructive" disabled={busy} onClick={() => { void run(() => control.stop(noteId)); }}>{copy.stop}</Button>
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 font-medium"><Link2 className="size-4" />{copy.offerTitle}</p>
            <p className="text-xs text-muted-foreground">{copy.offerBody}{control.isPro ? '' : ` ${copy.proOnly}`}</p>
            {control.isPro
              ? <Button size="sm" className="w-full" disabled={busy} onClick={() => { void run(() => control.start(noteId)); }}>{busy ? copy.creating : copy.create}</Button>
              : <Button size="sm" className="w-full" onClick={openPro}>{proCopy[lang].upgrade}</Button>}
          </>
        )}
        {failed && <p role="alert" className="text-xs text-destructive">{copy.failed}</p>}
      </PopoverContent>
    </Popover>
  );
}

/** The small mark on a shared memo's card in the list. */
export function SharedMark({ noteId }: { noteId: string }) {
  const { lang } = useLang();
  const control = useShare();
  if (!control?.shared.has(noteId)) return null;
  return <Link2 role="img" aria-label={shareActionCopy[lang].shared} className={cn('memo-shared mr-1 size-3 shrink-0', SHARED_CLASS)} />;
}
