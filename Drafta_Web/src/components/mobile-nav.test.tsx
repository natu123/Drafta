/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appTranslations } from '@/app/translations';
import type { Note } from '@/lib/types';
import { MobileNav, type MobilePane } from './mobile-nav';

vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ t: appTranslations.ja, lang: 'ja' }) }));

const memo = (id: string, title: string): Note => ({ id, title, content: '', group: 'inbox', stars: 0, createdAt: '2026-10-23T00:00:00.000Z', updatedAt: '2026-10-23T00:00:00.000Z' });

describe('phone bottom navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onPane = vi.fn();
  const onOpenTab = vi.fn();
  const onCloseTab = vi.fn();
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
    onPane.mockClear(); onOpenTab.mockClear(); onCloseTab.mockClear();
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const mount = (pane: MobilePane, extra: Partial<React.ComponentProps<typeof MobileNav>> = {}) => act(() => root.render(
    <MobileNav pane={pane} onPane={onPane} onSearch={() => {}} onCreate={() => {}} tabs={[memo('a', '買い物'), memo('b', '')]} activeTabId="a"
      onOpenTab={onOpenTab} onCloseTab={onCloseTab} {...extra} />));
  const buttons = () => [...container.querySelectorAll<HTMLButtonElement>('nav > button')];

  it('shows five items with the open tabs at the right end', () => {
    mount('notes');
    expect(buttons().map(button => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['トレイ', 'メモ', '検索', '新規', '開いているタブ (2)']);
    expect(buttons()[1].getAttribute('aria-current')).toBe('page');
    act(() => buttons()[0].click());
    expect(onPane).toHaveBeenCalledWith('trays');
  });

  it('marks the tabs item while the editor is shown and lists the open memos', () => {
    mount('editor');
    expect(buttons()[4].getAttribute('aria-current')).toBe('page');
    act(() => buttons()[4].click());
    expect(document.body.textContent).toContain('開いているタブ (2)');
    act(() => document.querySelector<HTMLButtonElement>('[aria-label="無題のメモを閉じる"]')!.click());
    expect(onCloseTab).toHaveBeenCalledWith('b');
    act(() => [...document.querySelectorAll<HTMLButtonElement>('li button')].find(button => button.textContent?.includes('買い物'))!.click());
    expect(onOpenTab).toHaveBeenCalledWith('a');
  });

  it('cannot add without a tray and shows how many memo bodies have arrived', () => {
    mount('trays', { onCreate: undefined, progress: { loaded: 120, total: 562, label: '本文を読み込み中 (120 / 562)' } });
    expect(buttons()[3].disabled).toBe(true);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('本文を読み込み中 (120 / 562)');
  });
});
