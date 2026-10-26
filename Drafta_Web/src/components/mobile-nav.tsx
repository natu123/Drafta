'use client';

import * as React from 'react';
import { CloudOff, Inbox, List, Search, SquarePen } from 'lucide-react';
import { useLang } from '@/contexts/lang-context';
import { mobileCopy } from '@/lib/mobile-copy';
import type { Note } from '@/lib/types';
import { InlineNameEditor } from './inline-name-editor';
import { OpenTabsPopover, TabCount } from './open-tabs-list';

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
  const items: NavItem[] = [
    { key: 'trays', label: t.trays, icon: Inbox, current: pane === 'trays', onSelect: () => onPane('trays') },
    { key: 'notes', label: t.memosSection, icon: List, current: pane === 'notes', onSelect: () => onPane('notes') },
    // New sits in the middle as a round button: reachable with either thumb, and the most used.
    { key: 'new', label: copy.newMemo, icon: SquarePen, disabled: !onCreate, onSelect: () => onCreate?.() },
    { key: 'search', label: t.search, icon: Search, onSelect: onSearch },
  ];

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
        <OpenTabsPopover side="top" tabs={tabs} activeTabId={activeTabId} onOpenTab={onOpenTab} onCloseTab={onCloseTab}>
          <button type="button" className="mobile-nav-item" aria-current={pane === 'editor' ? 'page' : undefined} aria-label={`${copy.openTabs} (${tabs.length})`}>
            <TabCount count={tabs.length} />
            <span aria-hidden="true" className="mobile-nav-label">{copy.tabs}</span>
          </button>
        </OpenTabsPopover>
      </nav>
    </div>
  );
}
