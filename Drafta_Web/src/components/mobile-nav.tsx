'use client';

import * as React from 'react';
import { CloudOff, Inbox, List, Search, SquarePen, X } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { a11yCopy, withName } from '@/lib/a11y-copy';
import { mobileCopy } from '@/lib/mobile-copy';
import type { Note } from '@/lib/types';
import { cn, stripColorMarkdown } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { InlineNameEditor } from './inline-name-editor';

export type MobilePane = 'trays' | 'notes' | 'editor';

/**
 * Whether the on-screen keyboard is up: something editable has the focus and the keyboard has
 * narrowed the visible area. Focus alone is not enough, since Android's back key closes the
 * keyboard and keeps the focus; pinch zoom is taken out with the viewport scale.
 */
function useKeyboardOpen() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let timer = 0;
    const update = () => {
      clearTimeout(timer);
      // Read after the focus has settled: during focusout it is on the body.
      timer = window.setTimeout(() => {
        const target = document.activeElement;
        const typing = target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'TEXTAREA' || (target instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(target.type)));
        setOpen(typing && window.innerHeight - viewport.height * viewport.scale > 120);
      });
    };
    viewport.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      clearTimeout(timer);
      viewport.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return open;
}

/**
 * New's field, at the top of the screen so the keyboard never covers it (AGENTS.md, Creation).
 * Confirming adds the memo or tray and closes; nothing is opened. Tapping outside cancels.
 */
export function MobileCreateSheet({ label, title, placeholder, onConfirm, onCancel, picker }: {
  label: string; placeholder: string; onConfirm: (value: string) => void; onCancel: () => void;
  /** The visible heading when it differs from the field's name (the tray chip names the tray). */
  title?: string;
  /** A control before the field, such as the all memos view's tray chip; `onPicked` returns to the field. */
  picker?: React.ReactElement<{ onPicked?: () => void; inline?: boolean }>;
}) {
  const { t } = useLang();
  const input = React.useRef<HTMLInputElement>(null);
  const refocus = React.useCallback(() => { input.current?.focus(); }, []);
  return (
    <>
      <button type="button" className="mobile-create-backdrop" aria-label={t.cancel} tabIndex={-1} onClick={onCancel} />
      <div className="mobile-create" role="dialog" aria-label={label}>
        <p className="mobile-create-label">{title ?? label}</p>
        <InlineNameEditor compose inputRef={input} label={label} placeholder={placeholder} confirmLabel={t.create} onConfirm={onConfirm} onCancel={onCancel}
          prefix={picker && React.cloneElement(picker, { onPicked: refocus, inline: true })} />
      </div>
    </>
  );
}

type NavItem = { key: string; label: string; icon: React.ElementType; current?: boolean; disabled?: boolean; onSelect: () => void };

/**
 * The phone's bottom navigation (AGENTS.md, Mobile Layout): trays, memos, search, new, and the
 * open tabs at the bottom right. Above it, how many memo bodies have arrived on a new device.
 */
export function MobileNav({ pane, onPane, onSearch, onCreate, tabs, activeTabId, onOpenTab, onCloseTab, progress, saveProblem }: {
  pane: MobilePane;
  onPane: (pane: MobilePane) => void;
  onSearch: () => void;
  /** Opens the add field of the memo list; missing when there is no tray to add to. */
  onCreate?: () => void;
  tabs: Note[];
  activeTabId: string | null;
  onOpenTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  progress?: { loaded: number; total: number; label: string } | null;
  /** Why the workspace is not saved, when it is not; the save status icon is on the tray list only. */
  saveProblem?: string | null;
}) {
  const { t, lang } = useLang();
  const copy = mobileCopy[lang];
  const keyboardOpen = useKeyboardOpen();
  const [tabsOpen, setTabsOpen] = React.useState(false);
  const items: NavItem[] = [
    { key: 'trays', label: t.trays, icon: Inbox, current: pane === 'trays', onSelect: () => onPane('trays') },
    { key: 'notes', label: t.memosSection, icon: List, current: pane === 'notes', onSelect: () => onPane('notes') },
    // New sits in the middle as a round button: reachable with either thumb, and the most used.
    { key: 'new', label: copy.newMemo, icon: SquarePen, disabled: !onCreate, onSelect: () => onCreate?.() },
    { key: 'search', label: t.search, icon: Search, onSelect: onSearch },
  ];
  const tabCount = tabs.length > 99 ? '99+' : String(tabs.length);

  return (
    <div className="mobile-nav shrink-0 border-t bg-background" hidden={keyboardOpen}>
      {saveProblem && (
        <button type="button" role="alert" className="flex w-full items-center gap-2 border-b bg-destructive/10 px-4 py-1.5 text-start text-xs text-destructive" onClick={() => onPane('trays')}>
          <CloudOff aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{saveProblem}</span>
        </button>
      )}
      {progress && (
        <div role="status" className="flex items-center gap-2 border-b px-4 py-1 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">{progress.label}</span>
          <span aria-hidden="true" className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.total ? Math.round(progress.loaded / progress.total * 100) : 0}%` }} />
          </span>
        </div>
      )}
      <nav aria-label={copy.nav} className="grid h-14 grid-cols-5">
        {items.map(({ key, label, icon: Icon, current, disabled, onSelect }) => (
          <button key={key} type="button" className={key === 'new' ? 'mobile-nav-item mobile-nav-new' : 'mobile-nav-item'} aria-current={current ? 'page' : undefined} disabled={disabled} onClick={onSelect}>
            {key === 'new'
              ? <span aria-hidden="true" className="mobile-nav-new-circle"><Icon className="size-5" /></span>
              : <Icon aria-hidden="true" className="size-5" />}
            <span className="mobile-nav-label">{label}</span>
          </button>
        ))}
        <Popover open={tabsOpen} onOpenChange={setTabsOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="mobile-nav-item" aria-current={pane === 'editor' ? 'page' : undefined} aria-label={`${copy.openTabs} (${tabs.length})`}>
              {/* A square with the count, like a phone browser's tab switcher. */}
              <span aria-hidden="true" className={cn('mobile-tabs-count', tabCount.length > 2 && 'text-[8px]')}>{tabCount}</span>
              <span aria-hidden="true" className="mobile-nav-label">{copy.tabs}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" sideOffset={6} collisionPadding={8} className="w-[min(24rem,calc(100vw-16px))] p-0">
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
                        onClick={() => { setTabsOpen(false); onOpenTab(note.id); }}>
                        <span aria-hidden="true" className="shrink-0 text-base">{note.icon || '📝'}</span>
                        <span className="truncate">{title}</span>
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
      </nav>
    </div>
  );
}
