'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLang } from '@/contexts/lang-context';
import { planEvernoteImport } from '@/lib/evernote-import';
import { importCopy, fillCopy } from '@/lib/import-copy';
import { planNotionImport } from '@/lib/notion-import';
import { checkImportLimits, importBatches, planObsidianImport, type ImportFile, type ImportLimitError, type ImportPlan } from '@/lib/obsidian-import';
import { transferCopy } from '@/lib/transfer-copy';
import { blobStream } from '@/lib/zip';
import type { BackupSettings } from '@/lib/workspace-backup';
import type { Group, Note } from '@/lib/types';

type Source = 'obsidian' | 'notion' | 'evernote';
const SOURCES: Source[] = ['obsidian', 'notion', 'evernote'];
const SOURCE_NAMES: Record<Source, string> = { obsidian: 'Obsidian', notion: 'Notion', evernote: 'Evernote' };
// File choosers per source (specs/20): a ZIP stands for a folder where a phone cannot choose one.
const ACCEPT: Record<Source, string> = { obsidian: '.md,text/markdown,.zip,application/zip', notion: '.zip,application/zip', evernote: '.enex,.zip,application/zip' };

type Stage =
  | { kind: 'select'; readFailed?: boolean }
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
  const transfer = transferCopy[lang];
  const [source, setSource] = React.useState<Source>('obsidian');
  const [stage, setStage] = React.useState<Stage>({ kind: 'select' });
  const folderInput = React.useRef<HTMLInputElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  // Reading can always be cancelled (closing too); only saving keeps the dialog open.
  const reading = React.useRef<AbortController | null>(null);
  const busy = stage.kind === 'saving';
  React.useEffect(() => () => reading.current?.abort(), []);

  // React has no typed prop for directory selection, and the dialog mounts its content lazily.
  const folderRef = React.useCallback((node: HTMLInputElement | null) => {
    folderInput.current = node;
    node?.setAttribute('webkitdirectory', '');
  }, []);

  const cancelReading = () => {
    reading.current?.abort();
    reading.current = null;
  };

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) cancelReading();
    onOpenChange(next);
    if (!next) setStage({ kind: 'select' });
  };

  const read = async (list: FileList | null) => {
    if (!list?.length) return;
    cancelReading();
    const controller = new AbortController();
    reading.current = controller;
    setStage({ kind: 'reading' });
    try {
      const files: ImportFile[] = Array.from(list).map(file => ({ path: file.webkitRelativePath || file.name, size: file.size, lastModified: file.lastModified,
        read: () => file.text(), blob: file, stream: () => blobStream(file) }));
      const options = { dom: document, newId: () => crypto.randomUUID(), listStyle: existing.settings.listStyle, signal: controller.signal };
      const embedLabels = { image: labels.image, file: labels.file, encrypted: transfer.encrypted, vault: SOURCE_NAMES[source] };
      const plan = source === 'notion' ? await planNotionImport(files, { ...options, labels: { ...embedLabels, notion: SOURCE_NAMES.notion } })
        : source === 'evernote' ? await planEvernoteImport(files, { ...options, labels: { ...embedLabels, evernote: SOURCE_NAMES.evernote } })
          : await planObsidianImport(files, { ...options, labels: embedLabels });
      const limit = plan.notes.length ? checkImportLimits(existing, plan, document) : null;
      if (!controller.signal.aborted) setStage({ kind: 'preview', plan, limit });
    } catch {
      // A cancelled read has already gone back to the start; anything else is reported there.
      if (!controller.signal.aborted) setStage({ kind: 'select', readFailed: true });
    } finally {
      if (reading.current === controller) reading.current = null;
    }
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
  // After the import, the list of files left out stays open next to the result.
  const skippedList = (plan: ImportPlan, expanded: boolean) => plan.skipped.length > 0 && (
    <details open={expanded}>
      <summary className="cursor-pointer">{fillCopy(labels.skipped, { count: plan.skipped.length })}</summary>
      <ul className="mt-1 max-h-32 overflow-y-auto rounded-md border px-3 py-2">
        {plan.skipped.map(item => <li key={item.path} className="break-all">{item.path} — {labels.reasons[item.reason]}</li>)}
      </ul>
    </details>
  );
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          {/* Once saved, the selection guidance ("nothing is saved until you confirm") no longer applies. */}
          <DialogTitle>{stage.kind === 'done' ? labels.done.title : labels.title}</DialogTitle>
          {stage.kind === 'done' ? (
            <DialogDescription role="status" className="text-base font-medium text-foreground">
              {stage.plan.groups.length === 1
                ? fillCopy(labels.done.one, { tray: stage.plan.groups[0].name, memos: stage.plan.notes.length })
                : fillCopy(labels.done.many, { trays: stage.plan.groups.length, memos: stage.plan.notes.length })}
            </DialogDescription>
          ) : <DialogDescription>{source === 'obsidian' ? labels.description : transfer.descriptions[source]}</DialogDescription>}
        </DialogHeader>
        <input ref={folderRef} type="file" multiple hidden onChange={event => { void read(event.target.files); event.target.value = ''; }} />
        <input ref={fileInput} type="file" accept={ACCEPT[source]} multiple hidden onChange={event => { void read(event.target.files); event.target.value = ''; }} />

        {stage.kind === 'select' && (
          <div className="space-y-4">
            <RadioGroup value={source} onValueChange={value => setSource(value as Source)} aria-label={transfer.source} className="flex flex-wrap gap-x-5 gap-y-2">
              {SOURCES.map(item => (
                <div key={item} className="flex items-center gap-2">
                  <RadioGroupItem value={item} id={`import-source-${item}`} />
                  <Label htmlFor={`import-source-${item}`}>{SOURCE_NAMES[item]}</Label>
                </div>
              ))}
            </RadioGroup>
            <div className="flex flex-wrap gap-2">
              {source === 'obsidian' && <>
                <Button onClick={() => folderInput.current?.click()}>{labels.chooseFolder}</Button>
                <Button variant="outline" onClick={() => fileInput.current?.click()}>{labels.chooseFiles}</Button>
              </>}
              {source === 'notion' && <>
                <Button onClick={() => fileInput.current?.click()}>{transfer.chooseZip}</Button>
                <Button variant="outline" onClick={() => folderInput.current?.click()}>{labels.chooseFolder}</Button>
              </>}
              {source === 'evernote' && <Button onClick={() => fileInput.current?.click()}>{transfer.chooseEnex}</Button>}
            </div>
          </div>
        )}
        {stage.kind === 'select' && stage.readFailed && <p role="alert" className="text-sm text-destructive">{transfer.readFailed}</p>}
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
            ) : <p role="alert">{source === 'obsidian' ? labels.nothing : transfer.nothing[source]}</p>}
            {plan.embeds > 0 && <p>{fillCopy(labels.embeds, { count: plan.embeds })}</p>}
            {skippedList(plan, false)}
            {stage.kind === 'preview' && stage.limit && <p role="alert" className="text-destructive">{labels.limits[stage.limit]}</p>}
            {stage.kind === 'saving' && <p role="status">{fillCopy(labels.saving, { done: stage.done, total: stage.total })}</p>}
            {stage.kind === 'failed' && <p role="alert" className="text-destructive">{fillCopy(labels.failed, { saved: stage.saved, unsaved: stage.plan.notes.length - stage.saved })}</p>}
          </div>
        )}
        {stage.kind === 'done' && (stage.plan.groups.length > 1 || stage.plan.skipped.length > 0) && (
          <div className="space-y-3 text-sm">
            {stage.plan.groups.length > 1 && (
              <ul className="max-h-24 overflow-y-auto rounded-md border px-3 py-2">
                {stage.plan.groups.map(group => <li key={group.id} className="truncate">{group.name}</li>)}
              </ul>
            )}
            {skippedList(stage.plan, true)}
          </div>
        )}

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
          {stage.kind === 'reading' && <Button variant="outline" onClick={() => { cancelReading(); setStage({ kind: 'select' }); }}>{labels.cancel}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
