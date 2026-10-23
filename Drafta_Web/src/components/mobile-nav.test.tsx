/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appTranslations } from '@/app/translations';
import type { Note } from '@/lib/types';
import { MobileCreateSheet, MobileNav, type MobilePane } from './mobile-nav';

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

  it("New's field adds on Enter and is cancelled by tapping outside", () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    act(() => root.render(<MobileCreateSheet label="Inboxにメモを追加" placeholder="無題のメモ" onConfirm={confirm} onCancel={cancel} />));
    const input = container.querySelector('input')!;
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Inboxにメモを追加');
    expect(document.activeElement).toBe(input);
    act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(confirm).toHaveBeenCalledWith('');
    act(() => container.querySelector<HTMLButtonElement>('.mobile-create-backdrop')!.click());
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('shows a failed save on every pane and leads to the account on the tray list', () => {
    mount('editor', { saveProblem: '保存できませんでした' });
    const alert = container.querySelector<HTMLButtonElement>('[role="alert"]')!;
    expect(alert.textContent).toBe('保存できませんでした');
    act(() => alert.click());
    expect(onPane).toHaveBeenCalledWith('trays');
    mount('editor', { saveProblem: null });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
