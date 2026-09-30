'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { History } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { memoHistoryCopy } from '@/lib/memo-history-copy';
import type { MemoHistoryRepository, MemoHistoryVersion } from '@/lib/memo-history';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const HistoryDialog = dynamic(() => import('./memo-history-dialog').then(module => module.MemoHistoryDialog), { ssr: false });
export function MemoHistoryAction({ noteId, history, onRestore }: { noteId: string; history: Pick<MemoHistoryRepository, 'list'>; onRestore: (version: MemoHistoryVersion) => void }) {
  const { lang } = useLang(); const [open, setOpen] = React.useState(false); const label = memoHistoryCopy[lang].title;
  return <><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-10" aria-label={label} onClick={() => setOpen(true)}><History data-icon="inline-start" /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
    {open ? <HistoryDialog noteId={noteId} history={history} onClose={() => setOpen(false)} onRestore={onRestore} /> : null}
  </>;
}
