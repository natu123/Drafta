/** @vitest-environment jsdom */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportDialog } from './export-dialog';
import { transferCopy } from '@/lib/transfer-copy';
import { listZip } from '@/lib/zip';
import type { Group, Note } from '@/lib/types';

vi.mock('@/contexts/lang-context', () => ({ useLang: () => ({ lang: 'ja', t: { untitledMemo: '無題のメモ', untitledTray: '無題のトレイ' } }) }));

const copy = transferCopy.ja.export;
const groups: Group[] = [{ id: 'g1', name: '仕事', type: 'group' }];
const notes: Note[] = [{ id: 'n1', title: '計画', content: '<p>本文</p>', group: 'g1', stars: 0, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z' }];

describe('export dialog', () => {
  let container: HTMLDivElement;
  let root: Root;
  let saved: Blob | null = null;
  let name = '';
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
    saved = null;
    Object.assign(URL, { createObjectURL: (blob: Blob) => { saved = blob; return 'blob:test'; }, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download; });
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

  it('describes what each format leaves out and saves the chosen format', async () => {
    act(() => root.render(<ExportDialog open onOpenChange={vi.fn()} notes={notes} groups={groups} />));
    const evernote = document.querySelector<HTMLButtonElement>('#export-format-evernote')!;
    expect(document.getElementById(evernote.getAttribute('aria-describedby')!)!.textContent).toBe(copy.details.evernote);
    act(() => evernote.click());
    const button = [...document.querySelectorAll('button')].find(item => item.textContent === copy.button)!;
    await act(async () => { button.click(); });
    await vi.waitFor(() => expect(document.body.textContent).toContain('メモ 1件を「'));
    expect(name).toMatch(/^Drafta-evernote-\d{4}-\d{2}-\d{2}\.zip$/);
    expect((await listZip(saved!)).map(entry => entry.path)).toEqual(['仕事.enex']);
  });

  it('says so when there is nothing to export', async () => {
    act(() => root.render(<ExportDialog open onOpenChange={vi.fn()} notes={[]} groups={groups} />));
    const button = [...document.querySelectorAll('button')].find(item => item.textContent === copy.button)!;
    await act(async () => { button.click(); });
    await vi.waitFor(() => expect(document.body.textContent).toContain(copy.empty));
  });
});
