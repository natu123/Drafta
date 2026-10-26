"use client";

import * as React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoryNav } from '@/components/header';
import { OpenTabsPopover, TabCount } from '@/components/open-tabs-list';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import type { HistoryItem, Note } from '@/lib/types';

/** The focus view toggle, at the start of the editor's toolbar on tablets and PCs (AGENTS.md, Web Layout). */
export function FocusToggle({ focused, onToggle }: { focused: boolean; onToggle: () => void }) {
  const { t } = useLang();
  const label = focused ? t.focusModeExit : t.focusMode;
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} aria-pressed={focused} onClick={onToggle}>
      {focused ? <PanelLeftOpen /> : <PanelLeftClose />}
    </Button>
  );
}

/**
 * "Tabs" with the count, which opens the same floating list as on phones, and the recently opened
 * memos, at the end of the editor's toolbar on tablets and PCs (AGENTS.md, Web Layout). They sat in a
 * bar above the editor until the title row became always visible (2026-10-26).
 */
export function EditorTabs({ tabs, activeTabId, onOpenTab, onCloseTab, history, onHistorySelect }: {
  tabs: Note[];
  activeTabId: string | null;
  onOpenTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}) {
  const { lang } = useLang();
  const copy = mobileCopy[lang];
  return (
    <>
      <OpenTabsPopover side="bottom" tabs={tabs} activeTabId={activeTabId} onOpenTab={onOpenTab} onCloseTab={onCloseTab}>
        <Button variant="ghost" className="editor-tabs-button gap-1.5" aria-label={`${copy.openTabs} (${tabs.length})`} title={copy.openTabs}>
          <TabCount count={tabs.length} />
          <span aria-hidden="true">{copy.tabs}</span>
        </Button>
      </OpenTabsPopover>
      <HistoryNav history={history} onHistorySelect={onHistorySelect} />
    </>
  );
}
