"use client";

import * as React from 'react';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HistoryNav } from '@/components/header';
import { useLang } from '@/contexts/lang-context';
import { a11yCopy, withName } from '@/lib/a11y-copy';
import { mobileCopy } from '@/lib/mobile-copy';
import { cn, stripColorMarkdown } from '@/lib/utils';
import type { HistoryItem, Note } from '@/lib/types';

type DropSpot = { id: string; after: boolean };

/**
 * The open memos as tabs above the editor on tablets and PCs, always shown: open, close (× or the
 * middle button) and drag to reorder. The focus view toggle sits at the start, the list of every
 * open tab and the recently opened memos at the end (AGENTS.md, Web Layout; specs/21_web_layout.md).
 */
export function TabStrip({ items, activeId, onSelect, onClose, onReorder, focused, onToggleFocus, history, onHistorySelect }: {
  items: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onReorder: (draggedId: string, targetId: string, after: boolean) => void;
  focused: boolean;
  onToggleFocus: () => void;
  history: HistoryItem[];
  onHistorySelect: (id: string, type: 'note') => void;
}) {
  const { t, lang } = useLang();
  const words = mobileCopy[lang];
  const listRef = React.useRef<HTMLDivElement>(null);
  const [dragged, setDragged] = React.useState<string | null>(null);
  const [drop, setDrop] = React.useState<DropSpot | null>(null);
  const titleOf = (note: Note) => stripColorMarkdown(note.title) || t.untitledMemo;

  // The open memo's tab comes into view when it changes or a tab is added.
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId, items.length]);

  const endDrag = () => { setDragged(null); setDrop(null); };
  const spotAt = (event: React.DragEvent<HTMLElement>, id: string): DropSpot => {
    const box = event.currentTarget.getBoundingClientRect();
    const after = event.clientX > box.left + box.width / 2;
    return { id, after: document.documentElement.dir === 'rtl' ? !after : after };
  };
  // Arrow keys move between tabs; Enter or Space opens one, Delete closes it.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    const tabs = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
    const index = tabs.indexOf(event.currentTarget);
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step) {
      event.preventDefault();
      tabs[(index + (document.documentElement.dir === 'rtl' ? -step : step) + tabs.length) % tabs.length]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
    } else if (event.key === 'Delete') {
      event.preventDefault();
      onClose(id);
    }
  };

  return (
    <div className="tab-strip flex h-11 shrink-0 items-end gap-1 border-b bg-secondary px-1">
      <Button variant="ghost" size="icon" className="mb-1 h-8 w-8 shrink-0" aria-label={focused ? t.focusModeExit : t.focusMode} title={focused ? t.focusModeExit : t.focusMode} aria-pressed={focused} onClick={onToggleFocus}>
        {focused ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
      </Button>
      {/* While a tab is dragged, the strip scrolls near its ends so hidden tabs can be reached, and a
          drop past the last tab moves the tab to the end. */}
      <div
        ref={listRef}
        role="tablist"
        aria-label={words.openTabs}
        className="tab-strip-list flex min-w-0 flex-1 items-end gap-0.5 self-stretch overflow-x-auto"
        onDragOver={event => {
          if (!dragged) return;
          event.preventDefault();
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left + 40) event.currentTarget.scrollLeft -= 16;
          else if (event.clientX > box.right - 40) event.currentTarget.scrollLeft += 16;
        }}
        onDrop={event => {
          if (!dragged || (event.target as HTMLElement).closest('[role="tab"]')) return;
          event.preventDefault();
          const last = items[items.length - 1];
          if (last && last.id !== dragged) onReorder(dragged, last.id, true);
          endDrag();
        }}
      >
        {items.length === 0 && <span className="mb-2.5 truncate px-2 text-sm text-muted-foreground">{words.noTabs}</span>}
        {items.map(item => {
          const active = item.id === activeId;
          const title = titleOf(item);
          return (
            <div
              key={item.id}
              role="tab"
              aria-selected={active}
              tabIndex={active || (!activeId && item === items[0]) ? 0 : -1}
              title={title}
              draggable
              onDragStart={event => { setDragged(item.id); event.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={event => { if (!dragged) return; event.preventDefault(); setDrop(spotAt(event, item.id)); }}
              onDrop={event => { event.preventDefault(); if (dragged && dragged !== item.id) onReorder(dragged, item.id, spotAt(event, item.id).after); endDrag(); }}
              onDragEnd={endDrag}
              onClick={() => onSelect(item.id)}
              onMouseDown={event => { if (event.button === 1) event.preventDefault(); }}
              onAuxClick={event => { if (event.button === 1) { event.preventDefault(); onClose(item.id); } }}
              onKeyDown={event => handleKeyDown(event, item.id)}
              className={cn(
                'tab-strip-tab group relative flex h-9 max-w-52 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-t-md border border-b-0 pl-2.5 pr-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? '-mb-px h-[37px] border-border bg-background text-foreground' : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground',
                dragged === item.id && 'opacity-50',
                drop?.id === item.id && dragged !== item.id && (drop.after ? 'shadow-[inset_-2px_0_0_hsl(var(--primary))]' : 'shadow-[inset_2px_0_0_hsl(var(--primary))]'),
              )}
            >
              <span aria-hidden="true" className="shrink-0">{item.icon || '📝'}</span>
              <span className={cn('truncate', item.isCompleted && 'line-through opacity-70')}>{title}</span>
              <button
                type="button"
                tabIndex={-1}
                aria-label={withName(a11yCopy[lang].closeTab, title)}
                title={withName(a11yCopy[lang].closeTab, title)}
                className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted', !active && 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100')}
                onClick={event => { event.stopPropagation(); onClose(item.id); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mb-1 flex shrink-0 items-center [&_button]:h-8 [&_button]:w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={words.openTabs} title={words.openTabs} disabled={!items.length}>
              <ChevronDown className="h-[18px] w-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[60vh] w-72 overflow-y-auto">
            <DropdownMenuLabel>{words.openTabs} ({items.length})</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.map(item => (
              <DropdownMenuItem key={item.id} onSelect={() => onSelect(item.id)} className={cn(item.id === activeId && 'bg-primary/10 font-medium text-primary')}>
                <span aria-hidden="true" className="shrink-0">{item.icon || '📝'}</span>
                <span className={cn('truncate', item.isCompleted && 'line-through opacity-70')}>{titleOf(item)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <HistoryNav history={history} onHistorySelect={onHistorySelect} />
      </div>
    </div>
  );
}
