/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportDialog } from './import-dialog';
import { importCopy } from '@/lib/import-copy';

vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ lang: 'ja' }) }));

const labels = importCopy.ja;
const file = (path: string, text: string, lastModified = Date.UTC(2026, 9, 9)) => {
  const value = new File([text], path.split('/').pop()!, { type: 'text/markdown', lastModified });
  Object.defineProperty(value, 'webkitRelativePath', { value: path });
  return value;
};

let importedTitles: string[] = [];

describe('import completion screen', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  const importFiles = async (files: File[], listStyle: 'top' | 'bottom' = 'top') => {
    const onBatch = vi.fn(async () => true);
    act(() => root.render(<ImportDialog open onOpenChange={vi.fn()} onBatch={onBatch} onRetry={vi.fn(async () => true)} onShowTray={vi.fn()}
      existing={{ notes: [], groups: [], settings: { language: 'ja', theme: 'system', listStyle, noteSort: 'manual' } }} />));
    const input = document.querySelector<HTMLInputElement>('input[webkitdirectory]')!;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await vi.waitFor(() => expect(document.body.textContent).toContain(labels.confirm));
    const confirm = [...document.querySelectorAll('button')].find(button => button.textContent === labels.confirm)!;
    await act(async () => { confirm.click(); });
    await vi.waitFor(() => expect(document.body.textContent).toContain(labels.done.title));
    importedTitles = onBatch.mock.calls.flatMap(call => (call as unknown as [unknown, { title: string }[]])[1].map(note => note.title));
    return document.querySelector('[role="dialog"]')!;
  };

  it('replaces the selection guidance with the tray name and memo count', async () => {
    const dialog = await importFiles([file('Vault/a.md', '# A'), file('Vault/b.md', 'B')]);
    expect(dialog.textContent).toContain('トレイ「Vault」に, メモ 2件を保存しました.');
    expect(dialog.textContent).not.toContain(labels.description);
    expect(dialog.querySelector('details')).toBeNull();
    expect([...dialog.querySelectorAll('button')].map(button => button.textContent)).toEqual(expect.arrayContaining([labels.close, labels.showTray]));
  });

  it('lists every new tray and keeps the files left out open on the same screen', async () => {
    const dialog = await importFiles([file('Vault/root.md', 'Root'), file('Vault/Folder/inner.md', 'Inner'), file('Vault/picture.png', 'x')]);
    expect(dialog.textContent).toContain('新しいトレイ 2個に, メモ 2件を保存しました.');
    expect([...dialog.querySelectorAll('li')].map(item => item.textContent)).toEqual(expect.arrayContaining(['Vault', 'Vault / Folder', `Vault/picture.png — ${labels.reasons.unsupported}`]));
    expect(dialog.querySelector('details')!.open).toBe(true);
  });

  it('saves memos newest first with the ToDo style and newest last with the chat style', async () => {
    const files = () => [file('Vault/old.md', 'O', Date.UTC(2026, 0, 1)), file('Vault/new.md', 'N', Date.UTC(2026, 9, 1))];
    await importFiles(files(), 'top');
    expect(importedTitles).toEqual(['new', 'old']);
    act(() => root.unmount()); root = createRoot(container);
    await importFiles(files(), 'bottom');
    expect(importedTitles).toEqual(['old', 'new']);
  });
});
