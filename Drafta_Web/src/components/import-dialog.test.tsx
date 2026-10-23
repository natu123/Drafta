/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportDialog } from './import-dialog';
import { importCopy } from '@/lib/import-copy';
import { transferCopy } from '@/lib/transfer-copy';

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
    act(() => document.querySelector<HTMLButtonElement>('#import-source-obsidian')!.click());
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

describe('import sources', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it('switches the guidance and file chooser by source and imports an Evernote notebook', async () => {
    const onBatch = vi.fn(async () => true);
    act(() => root.render(<ImportDialog open onOpenChange={vi.fn()} onBatch={onBatch} onRetry={vi.fn(async () => true)} onShowTray={vi.fn()}
      existing={{ notes: [], groups: [], settings: { language: 'ja', theme: 'system', listStyle: 'top', noteSort: 'manual' } }} />));
    const group = document.querySelector('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-label')).toBe(transferCopy.ja.source);
    expect([...group.querySelectorAll('label')].map(label => label.textContent)).toEqual(['Notion', 'Evernote', 'Obsidian']);
    expect(document.querySelector('#import-source-notion')!.getAttribute('aria-checked')).toBe('true');
    expect(document.body.textContent).toContain(transferCopy.ja.descriptions.notion);
    expect(document.body.textContent).toContain(transferCopy.ja.chooseZip);
    act(() => document.querySelector<HTMLButtonElement>('#import-source-evernote')!.click());
    expect(document.body.textContent).toContain(transferCopy.ja.chooseEnex);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]:not([webkitdirectory])')!;
    expect(input.accept).toContain('.enex');
    const enex = '<?xml version="1.0"?><en-export><note><title>買い物</title><content><![CDATA[<en-note><div><en-todo checked="true"/>牛乳</div></en-note>]]></content><created>20260101T000000Z</created></note></en-export>';
    Object.defineProperty(input, 'files', { value: [new File([enex], '家.enex', { lastModified: Date.UTC(2026, 9, 9) })], configurable: true });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
    await vi.waitFor(() => expect(document.body.textContent).toContain(labels.confirm));
    const confirm = [...document.querySelectorAll('button')].find(button => button.textContent === labels.confirm)!;
    await act(async () => { confirm.click(); });
    await vi.waitFor(() => expect(document.body.textContent).toContain('トレイ「家」に, メモ 1件を保存しました.'));
    const [groups, notes] = onBatch.mock.calls[0] as unknown as [{ name: string }[], { title: string; content: string }[]];
    expect(groups.map(item => item.name)).toEqual(['家']);
    expect(notes[0].title).toBe('買い物');
    expect(notes[0].content).toContain('data-checked="true"');
  });
});

describe('reading files', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  const render = (onOpenChange = vi.fn()) => {
    act(() => root.render(<ImportDialog open onOpenChange={onOpenChange} onBatch={vi.fn(async () => true)} onRetry={vi.fn(async () => true)} onShowTray={vi.fn()}
      existing={{ notes: [], groups: [], settings: { language: 'ja', theme: 'system', listStyle: 'top', noteSort: 'manual' } }} />));
    return onOpenChange;
  };
  const choose = async (files: File[]) => {
    const input = document.querySelector<HTMLInputElement>('input[webkitdirectory]')!;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  };

  it('leaves the reading state and reports a read that fails', async () => {
    render();
    const broken = new File(['x'], 'a.md');
    Object.defineProperty(broken, 'webkitRelativePath', { get() { throw new Error('unreadable'); } });
    await choose([broken]);
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')?.textContent).toBe(transferCopy.ja.readFailed));
    expect(document.body.textContent).not.toContain(labels.reading);
    expect(document.body.textContent).toContain(labels.chooseFolder);
  });

  it('cancels a read that does not finish and can close meanwhile', async () => {
    const onOpenChange = render();
    const stuck = new File(['x'], 'a.md');
    Object.defineProperty(stuck, 'webkitRelativePath', { value: 'Vault/a.md' });
    Object.defineProperty(stuck, 'text', { value: () => new Promise<string>(() => {}) });
    await choose([stuck]);
    await vi.waitFor(() => expect(document.body.textContent).toContain(labels.reading));
    const cancel = [...document.querySelectorAll('button')].find(button => button.textContent === labels.cancel)!;
    act(() => cancel.click());
    expect(document.body.textContent).not.toContain(labels.reading);
    expect(document.body.textContent).toContain(labels.chooseFolder);
    await choose([stuck]);
    await vi.waitFor(() => expect(document.body.textContent).toContain(labels.reading));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
