'use client';

import * as React from 'react';
import { Pin, Trash2 } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/**
 * Delete, history, share, reminder, search and pin for the open memo, in that order, on the right of the editor's
 * toolbar (AGENTS.md, Editor Layout; Gles's order of 2026-10-26). The editor hands in its search button.
 * Delete sits right before history, search and pin, on PCs after a gap from Plain/Rich and Remove
 * formatting (Gles's choices of 2026-10-26).
 */
export function MemoActions({ isPinned, onTogglePin, historyAction, shareAction, reminderAction, onDelete, search }: {
  isPinned: boolean;
  onTogglePin?: () => void;
  historyAction?: React.ReactNode;
  /** Share links, next to history (specs/24, 4). */
  shareAction?: React.ReactNode;
  /** The reminder's bell, after share (specs/25). */
  reminderAction?: React.ReactNode;
  onDelete?: () => void;
  search?: React.ReactNode;
}) {
  const { t, lang } = useLang();
  const pinLabel = isPinned ? t.unpinMemo : t.pinMemo;
  if (!onTogglePin && !historyAction && !shareAction && !reminderAction && !onDelete && !search) return null;
  return (
    <>
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="memo-delete" aria-label={t.deleteMemo} onClick={onDelete}><Trash2 /></Button>
          </TooltipTrigger>
          <TooltipContent>{t.deleteMemo}</TooltipContent>
        </Tooltip>
      )}
    <div role="group" aria-label={mobileCopy[lang].memoActions} className="editor-memo-actions">
      {historyAction}
      {shareAction}
      {reminderAction}
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
