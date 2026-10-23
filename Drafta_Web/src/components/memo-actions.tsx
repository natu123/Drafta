'use client';

import * as React from 'react';
import { Pin, Trash2 } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/**
 * Pin, history and delete for the open memo, at the right end of the editor's toolbar
 * (AGENTS.md, Editor Layout). The title line keeps only the memo icon.
 */
export function MemoActions({ isPinned, onTogglePin, historyAction, onDelete }: {
  isPinned: boolean;
  onTogglePin?: () => void;
  historyAction?: React.ReactNode;
  onDelete?: () => void;
}) {
  const { t, lang } = useLang();
  const pinLabel = isPinned ? t.unpinMemo : t.pinMemo;
  if (!onTogglePin && !historyAction && !onDelete) return null;
  return (
    <div role="group" aria-label={mobileCopy[lang].memoActions} className="editor-memo-actions">
      {onTogglePin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn(isPinned && 'text-[#C49547]')} aria-label={pinLabel} aria-pressed={isPinned} onClick={onTogglePin}><Pin className={isPinned ? 'fill-current' : ''} /></Button>
          </TooltipTrigger>
          <TooltipContent>{pinLabel}</TooltipContent>
        </Tooltip>
      )}
      {historyAction}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t.delete} onClick={onDelete}><Trash2 /></Button>
          </TooltipTrigger>
          <TooltipContent>{t.delete}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
