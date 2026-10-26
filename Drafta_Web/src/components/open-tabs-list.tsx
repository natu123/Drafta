'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { a11yCopy, withName } from '@/lib/a11y-copy';
import { mobileCopy } from '@/lib/mobile-copy';
import type { Note } from '@/lib/types';
import { cn, stripColorMarkdown } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

/** The count in a square, like a phone browser's tab switcher. */
export function TabCount({ count }: { count: number }) {
  const label = count > 99 ? '99+' : String(count);
  return <span aria-hidden="true" className={cn('mobile-tabs-count', label.length > 2 && 'text-[8px]')}>{label}</span>;
}

/**
 * The open memos as a card floating over a dimmed screen: open one, or close it with ×. The phone's
 * bottom navigation and the editor bar of tablets and PCs open the same list (AGENTS.md, Mobile
 * Layout and Web Layout; the card and the dimming are Gles's choice of 2026-10-26).
 */
export function OpenTabsPopover({ tabs, activeTabId, onOpenTab, onCloseTab, side, children }: {
  tabs: Note[];
  activeTabId: string | null;
  onOpenTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  side: 'top' | 'bottom';
  children: React.ReactElement;
}) {
  const { t, lang } = useLang();
  const copy = mobileCopy[lang];
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {open && createPortal(<div aria-hidden="true" className="open-tabs-backdrop fixed inset-0 z-40 bg-black/35" />, document.body)}
      <PopoverContent side={side} align="end" sideOffset={8} collisionPadding={8} className="w-[min(24rem,calc(100vw-16px))] overflow-hidden rounded-xl border p-0 shadow-2xl">
        <h2 className="border-b px-3 py-2 text-sm font-semibold">{copy.openTabs} ({tabs.length})</h2>
        {tabs.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">{copy.noTabs}</p>
        ) : (
          <ul className="max-h-[min(24rem,55dvh)] overflow-y-auto py-1">
            {tabs.map(note => {
              const title = stripColorMarkdown(note.title) || t.untitledMemo;
              const active = note.id === activeTabId;
              return (
                <li key={note.id} className={cn('flex items-center gap-1 pr-1', active && 'bg-primary/10')}>
                  <button type="button" className={cn('flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 text-start text-sm', active && 'font-medium text-primary')} aria-current={active ? 'true' : undefined}
                    onClick={() => { setOpen(false); onOpenTab(note.id); }}>
                    <span aria-hidden="true" className="shrink-0 text-base">{note.icon || '📝'}</span>
                    <span className={cn('truncate', note.isCompleted && 'line-through opacity-70')}>{title}</span>
                  </button>
                  <button type="button" className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={withName(a11yCopy[lang].closeTab, title)} onClick={() => onCloseTab(note.id)}>
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
