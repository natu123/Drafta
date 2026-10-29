'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProCopy } from '@/lib/pro-copy';

/**
 * Drafta Pro's small dialog from the account menu (specs/23, 3.5; Gles's choice of 2026-10-29): what Pro
 * adds, and yearly or monthly, each going on to Stripe's payment page.
 */
export function ProDialog({ open, onOpenChange, copy, onChoose }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ProCopy;
  /** Resolves once the browser is on its way to Stripe; rejects when the page could not be opened. */
  onChoose: (interval: 'year' | 'month') => Promise<void>;
}) {
  const [opening, setOpening] = React.useState<'year' | 'month' | null>(null);
  const [failed, setFailed] = React.useState(false);
  // Closing clears the last try, so the dialog opens fresh next time.
  const change = (next: boolean) => { if (!next) { setOpening(null); setFailed(false); } onOpenChange(next); };
  const choose = async (interval: 'year' | 'month') => {
    setOpening(interval); setFailed(false);
    try { await onChoose(interval); } catch { setFailed(true); setOpening(null); }
  };
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-w-sm gap-4">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {copy.features.map(feature => <li key={feature} className="flex gap-2"><span aria-hidden="true">✓</span>{feature}</li>)}
        </ul>
        <div className="flex flex-col gap-2">
          <Button disabled={opening !== null} onClick={() => { void choose('year'); }}>{opening === 'year' ? copy.opening : copy.yearly}</Button>
          <Button variant="outline" disabled={opening !== null} onClick={() => { void choose('month'); }}>{opening === 'month' ? copy.opening : copy.monthly}</Button>
        </div>
        {failed && <p role="alert" className="text-sm text-destructive">{copy.failed}</p>}
        <p className="text-xs text-muted-foreground">{copy.note}</p>
      </DialogContent>
    </Dialog>
  );
}
