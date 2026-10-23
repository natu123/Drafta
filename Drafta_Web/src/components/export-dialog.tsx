'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLang } from '@/contexts/lang-context';
import { fillCopy, importCopy } from '@/lib/import-copy';
import { transferCopy } from '@/lib/transfer-copy';
import { collectExport, exportWorkspace, type ExportFormat } from '@/lib/workspace-export';
import type { Group, Note } from '@/lib/types';

// Notion first, as in the import dialog (2026-10-23, Gles's request).
const FORMATS: ExportFormat[] = ['notion', 'evernote', 'obsidian'];
const FORMAT_NAMES: Record<ExportFormat, string> = { obsidian: 'Obsidian', notion: 'Notion', evernote: 'Evernote' };

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; memos: number; file: string } | { kind: 'failed' } | { kind: 'empty' };

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The memos as shown (samples in the display language), with bodies loaded (specs/17). */
  notes: Note[];
  groups: Group[];
}

/** Saves the workspace as a file for another app (specs/20). Nothing leaves the device. */
export function ExportDialog({ open, onOpenChange, notes, groups }: ExportDialogProps) {
  const { lang, t } = useLang();
  const copy = transferCopy[lang].export;
  const [format, setFormat] = React.useState<ExportFormat>('notion');
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });
  const working = status.kind === 'working';

  const close = (next: boolean) => {
    if (working) return;
    onOpenChange(next);
    if (!next) setStatus({ kind: 'idle' });
  };

  const run = async () => {
    setStatus({ kind: 'working' });
    try {
      // Let the status show before the conversion holds the page.
      await new Promise(resolve => setTimeout(resolve, 0));
      const trays = collectExport({ notes, groups }, document);
      if (!trays.some(tray => tray.memos.length)) { setStatus({ kind: 'empty' }); return; }
      const result = await exportWorkspace(format, trays, { untitledMemo: t.untitledMemo, untitledTray: t.untitledTray });
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setStatus({ kind: 'done', memos: result.memos, file: result.fileName });
    } catch {
      setStatus({ kind: 'failed' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={event => { if (working) event.preventDefault(); }} onPointerDownOutside={event => { if (working) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <RadioGroup value={format} onValueChange={value => { setFormat(value as ExportFormat); setStatus({ kind: 'idle' }); }} aria-label={copy.format} disabled={working} className="gap-3">
          {FORMATS.map(item => (
            <div key={item} className="flex items-start gap-2">
              <RadioGroupItem value={item} id={`export-format-${item}`} aria-describedby={`export-format-${item}-detail`} className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor={`export-format-${item}`}>{FORMAT_NAMES[item]}</Label>
                <p id={`export-format-${item}-detail`} className="text-sm text-muted-foreground">{copy.details[item]}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
        <div className="text-sm" aria-live="polite">
          {status.kind === 'working' && <p role="status">{copy.working}</p>}
          {status.kind === 'done' && <p role="status" className="break-all">{fillCopy(copy.done, { memos: status.memos, file: status.file })}</p>}
          {status.kind === 'empty' && <p role="alert">{copy.empty}</p>}
          {status.kind === 'failed' && <p role="alert" className="text-destructive">{copy.failed}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={working} onClick={() => close(false)}>{importCopy[lang].close}</Button>
          <Button disabled={working} onClick={() => { void run(); }}>{copy.button}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
