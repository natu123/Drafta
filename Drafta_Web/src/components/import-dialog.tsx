'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLang } from '@/contexts/lang-context';
import { importCopy, fillCopy } from '@/lib/import-copy';
import { checkImportLimits, importBatches, planObsidianImport, type ImportLimitError, type ImportPlan } from '@/lib/obsidian-import';
import type { BackupSettings } from '@/lib/workspace-backup';
import type { Group, Note } from '@/lib/types';

type Stage =
  | { kind: 'select' }
  | { kind: 'reading' }
  | { kind: 'preview'; plan: ImportPlan; limit: ImportLimitError | null }
  | { kind: 'saving'; plan: ImportPlan; done: number; total: number }
  | { kind: 'failed'; plan: ImportPlan; batches: Note[][]; index: number; saved: number }
  | { kind: 'done'; plan: ImportPlan };

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: { notes: Note[]; groups: Group[]; settings: BackupSettings };
  /** Adds one batch to the workspace and resolves once the server acknowledged it. */
  onBatch: (groups: Group[], notes: Note[]) => Promise<boolean>;
  /** Retries the save of a batch already in the workspace. */
  onRetry: () => Promise<boolean>;
  onShowTray: (groupId: string) => void;
}

export function ImportDialog({ open, onOpenChange, existing, onBatch, onRetry, onShowTray }: ImportDialogProps) {
  const { lang } = useLang();
  const labels = importCopy[lang];
  const [stage, setStage] = React.useState<Stage>({ kind: 'select' });
  const folderInput = React.useRef<HTMLInputElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const busy = stage.kind === 'reading' || stage.kind === 'saving';

  React.useEffect(() => {
    // React has no typed prop for directory selection.
    folderInput.current?.setAttribute('webkitdirectory', '');
  }, [open]);

  const close = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
    if (!next) setStage({ kind: 'select' });
  };

  const read = async (list: FileList | null) => {
    if (!list?.length) return;
    setStage({ kind: 'reading' });
    const files = Array.from(list).map(file => ({ path: file.webkitRelativePath || file.name, size: file.size, lastModified: file.lastModified, read: () => file.text() }));
    const plan = await planObsidianImport(files, { dom: document, labels: { image: labels.image, file: labels.file, vault: 'Obsidian' }, newId: () => crypto.randomUUID() });
    setStage({ kind: 'preview', plan, limit: plan.notes.length ? checkImportLimits(existing, plan, document) : null });
  };

  const save = async (plan: ImportPlan, batches: Note[][], start: number, saved: number, retrying: boolean) => {
    const total = plan.notes.length;
    let done = saved;
    for (let index = start; index < batches.length; index++) {
      setStage({ kind: 'saving', plan, done, total });
      const ok = retrying && index === start ? await onRetry() : await onBatch(index === 0 ? plan.groups : [], batches[index]);
      if (!ok) { setStage({ kind: 'failed', plan, batches, index, saved: done }); return; }
      done += batches[index].length;
    }
    setStage({ kind: 'done', plan });
  };

  const plan = stage.kind === 'select' || stage.kind === 'reading' ? null : stage.plan;
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <input ref={folderInput} type="file" multiple hidden onChange={event => { void read(event.target.files); event.target.value = ''; }} />
        <input ref={fileInput} type="file" accept=".md,text/markdown" multiple hidden onChange={event => { void read(event.target.files); event.target.value = ''; }} />

        {stage.kind === 'select' && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => folderInput.current?.click()}>{labels.chooseFolder}</Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>{labels.chooseFiles}</Button>
          </div>
        )}
        {stage.kind === 'reading' && <p role="status" aria-live="polite">{labels.reading}</p>}

        {plan && stage.kind !== 'done' && (
          <div className="space-y-3 text-sm" aria-live="polite">
            {plan.notes.length ? (
              <>
                <p className="font-medium">{fillCopy(labels.summary, { trays: plan.groups.length, memos: plan.notes.length })}</p>
                <ul className="max-h-24 overflow-y-auto rounded-md border px-3 py-2">
                  {plan.groups.map(group => <li key={group.id} className="truncate">{group.name}</li>)}
                </ul>
              </>
            ) : <p role="alert">{labels.nothing}</p>}
            {plan.embeds > 0 && <p>{fillCopy(labels.embeds, { count: plan.embeds })}</p>}
            {plan.skipped.length > 0 && (
              <details>
                <summary className="cursor-pointer">{fillCopy(labels.skipped, { count: plan.skipped.length })}</summary>
                <ul className="mt-1 max-h-32 overflow-y-auto rounded-md border px-3 py-2">
                  {plan.skipped.map(item => <li key={item.path} className="break-all">{item.path} — {labels.reasons[item.reason]}</li>)}
                </ul>
              </details>
            )}
            {stage.kind === 'preview' && stage.limit && <p role="alert" className="text-destructive">{labels.limits[stage.limit]}</p>}
            {stage.kind === 'saving' && <p role="status">{fillCopy(labels.saving, { done: stage.done, total: stage.total })}</p>}
            {stage.kind === 'failed' && <p role="alert" className="text-destructive">{fillCopy(labels.failed, { saved: stage.saved, unsaved: stage.plan.notes.length - stage.saved })}</p>}
          </div>
        )}
        {stage.kind === 'done' && <p role="status" className="text-sm">{fillCopy(labels.done, { memos: stage.plan.notes.length })}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          {stage.kind === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStage({ kind: 'select' })}>{labels.cancel}</Button>
              <Button disabled={!stage.plan.notes.length || stage.limit !== null} onClick={() => { void save(stage.plan, importBatches(stage.plan), 0, 0, false); }}>{labels.confirm}</Button>
            </>
          )}
          {stage.kind === 'failed' && (
            <>
              <Button variant="outline" onClick={() => close(false)}>{labels.close}</Button>
              <Button onClick={() => { void save(stage.plan, stage.batches, stage.index, stage.saved, true); }}>{labels.retry}</Button>
            </>
          )}
          {stage.kind === 'done' && (
            <>
              <Button variant="outline" onClick={() => close(false)}>{labels.close}</Button>
              <Button onClick={() => { onShowTray(stage.plan.groups[0].id); close(false); }}>{labels.showTray}</Button>
            </>
          )}
          {stage.kind === 'select' && <Button variant="outline" onClick={() => close(false)}>{labels.close}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
