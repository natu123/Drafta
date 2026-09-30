'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { memoHistoryCopy, memoHistoryCloseCopy } from '@/lib/memo-history-copy';
import { historyNoteToState } from '@/lib/memo-history-restore';
import { stripColorMarkdown } from '@/lib/utils';
import type { MemoHistoryRepository, MemoHistoryVersion } from '@/lib/memo-history';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

export function MemoHistoryDialog({ noteId, history, onClose, onRestore }: {
  noteId: string; history: Pick<MemoHistoryRepository, 'list'>; onClose: () => void;
  onRestore: (version: MemoHistoryVersion) => void;
}) {
  const { lang, t } = useLang(); const labels = memoHistoryCopy[lang];
  const [versions, setVersions] = React.useState<MemoHistoryVersion[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [restoring, setRestoring] = React.useState(false);
  const [request, setRequest] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setFailed(false);
      try {
        const next = await history.list(noteId);
        // Validate every returned document before exposing restore controls.
        next.forEach(version => historyNoteToState(version, document));
        if (active) { setVersions(next); setSelectedId(previous => next.some(version => version.id === previous) ? previous : next[0]?.id ?? null); }
      } catch { if (active) { setVersions([]); setSelectedId(null); setFailed(true); } }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [history, noteId, request]);
  const selected = versions.find(version => version.id === selectedId);
  const preview = React.useMemo(() => selected ? historyNoteToState(selected, document) : null, [selected]);
  const restore = () => {
    if (!selected || restoring) return;
    setRestoring(true);
    try { onRestore(selected); onClose(); } catch { setFailed(true); setRestoring(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !restoring) onClose(); }}>
    <DialogContent closeLabel={memoHistoryCloseCopy[lang]} className="flex max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-4xl flex-col gap-4 p-4 sm:p-6" dir={lang === 'ar' ? 'rtl' : undefined}>
      <DialogHeader><DialogTitle>{labels.title}</DialogTitle><DialogDescription>{labels.description}</DialogDescription></DialogHeader>
      {loading ? <p role="status">{labels.loading}</p> : failed ? <div className="flex flex-col gap-3"><p role="alert">{labels.failed}</p><Button variant="outline" onClick={() => setRequest(value => value + 1)}>{labels.retry}</Button></div>
        : !versions.length ? <p role="status">{labels.empty}</p> : <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label={labels.title} className="flex max-h-36 flex-col gap-1 overflow-y-auto md:max-h-[55dvh]">
            {versions.map(version => <Button key={version.id} variant={version.id === selectedId ? 'secondary' : 'ghost'} className="shrink-0 justify-start" aria-pressed={version.id === selectedId} onClick={() => setSelectedId(version.id)}>
              <time dateTime={version.capturedAt}>{new Date(version.capturedAt).toLocaleString(lang, { hour12: false })}</time>
            </Button>)}
          </nav>
          <section aria-label={labels.title} className="max-h-[45dvh] min-h-0 overflow-y-auto rounded-md border p-4 md:max-h-[55dvh]">
            <h2 className="mb-3 break-words text-xl font-semibold">{stripColorMarkdown(preview?.title ?? '') || t.untitledMemo}</h2>
            <div className="prose prose-sm max-w-none break-words dark:prose-invert" dangerouslySetInnerHTML={{ __html: preview?.content ?? '' }} />
          </section>
        </div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label={labels.refresh} disabled={loading || restoring} onClick={() => setRequest(value => value + 1)}><RefreshCw data-icon="inline-start" /></Button>
        <Button disabled={!selected || loading || failed || restoring} onClick={restore}>{restoring ? labels.restoring : labels.restore}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
