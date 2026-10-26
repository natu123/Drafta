'use client';

import * as React from 'react';
import { Pin, Trash2 } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/**
 * Delete, history, search and pin for the open memo, in that order, on the right of the editor's
 * toolbar (AGENTS.md, Editor Layout; Gles's order of 2026-10-26). The editor hands in its search button.
 * Delete stands apart from history, search and pin by a gap on PCs; on phones it sits right before
 * them at the end of the top row (Gles's choices of 2026-10-26).
 */
export function MemoActions({ isPinned, onTogglePin, historyAction, onDelete, search }: {
  isPinned: boolean;
  onTogglePin?: () => void;
  historyAction?: React.ReactNode;
  onDelete?: () => void;
  search?: React.ReactNode;
}) {
  const { t, lang } = useLang();
  const pinLabel = isPinned ? t.unpinMemo : t.pinMemo;
  if (!onTogglePin && !historyAction && !onDelete && !search) return null;
  return (
    <>
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="memo-delete" aria-label={t.delete} onClick={onDelete}><Trash2 /></Button>
          </TooltipTrigger>
          <TooltipContent>{t.delete}</TooltipContent>
        </Tooltip>
      )}
    <div role="group" aria-label={mobileCopy[lang].memoActions} className="editor-memo-actions">
      {historyAction}
      {search}
      {onTogglePin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn(isPinned && 'text-[#C49547]')} aria-label={pinLabel} aria-pressed={isPinned} onClick={onTogglePin}><Pin className={isPinned ? 'fill-current' : ''} /></Button>
          </TooltipTrigger>
          <TooltipContent>{pinLabel}</TooltipContent>
        </Tooltip>
      )}
    </div>
    </>
  );
}
