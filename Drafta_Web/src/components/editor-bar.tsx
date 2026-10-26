"use client";

import * as React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoryNav } from '@/components/header';
import { OpenTabsPopover, TabCount } from '@/components/open-tabs-list';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import { cn, stripColorMarkdown } from '@/lib/utils';
import type { HistoryItem, Note } from '@/lib/types';

/**
 * The bar above the editor on tablets and PCs: the focus view toggle and the open memo's name, then
 * "Tabs" with the count, which opens the same floating list as on phones, and the recently opened
 * memos (AGENTS.md, Web Layout). It replaced the row of tabs, which Gles found plain (2026-10-26).
 */
export function EditorBar({ tabs, activeNote, activeTabId, onOpenTab, onCloseTab, focused, onToggleFocus, history, onHistorySelect }: {
  tabs: Note[];
  activeNote: Note | null;
  activeTabId: string | null;
  onOpenTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  focused: boolean;
  onToggleFocus: () => void;
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}) {
  const { t, lang } = useLang();
  const copy = mobileCopy[lang];
  return (
    <div className="editor-bar flex h-11 shrink-0 items-center gap-1 border-b bg-background px-2">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={focused ? t.focusModeExit : t.focusMode} title={focused ? t.focusModeExit : t.focusMode} aria-pressed={focused} onClick={onToggleFocus}>
        {focused ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
      </Button>
      <p className="flex min-w-0 flex-1 items-center gap-1.5 px-1 text-sm text-muted-foreground">
        {activeNote ? <>
          <span aria-hidden="true" className="shrink-0">{activeNote.icon || '📝'}</span>
          <span className={cn('truncate', activeNote.isCompleted && 'line-through opacity-70')}>{stripColorMarkdown(activeNote.title) || t.untitledMemo}</span>
        </> : <span className="truncate">{copy.noTabs}</span>}
      </p>
      <OpenTabsPopover side="bottom" tabs={tabs} activeTabId={activeTabId} onOpenTab={onOpenTab} onCloseTab={onCloseTab}>
        <Button variant="ghost" className="editor-bar-tabs h-8 shrink-0 gap-1.5 px-2" aria-label={`${copy.openTabs} (${tabs.length})`} title={copy.openTabs}>
          <TabCount count={tabs.length} />
          <span aria-hidden="true">{copy.tabs}</span>
        </Button>
      </OpenTabsPopover>
      <div className="flex shrink-0 items-center [&_button]:h-8 [&_button]:w-8">
        <HistoryNav history={history} onHistorySelect={onHistorySelect} />
      </div>
    </div>
  );
}
