/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { checkImportLimits, importBatches, obsidianMarkdownToHtml, planObsidianImport, safeLinkUrl, type ImportFile } from './obsidian-import';
import { createWorkspaceBackup } from './workspace-backup';
import { CLOUD_LIMITS, WorkspaceStorageError, type SavedWorkspace } from './cloud-workspace';
import { WorkspaceSaveQueue } from './workspace-save-queue';
import type { WorkspaceBackup } from './workspace-backup';

const labels = { image: 'Image', file: 'File', vault: 'Obsidian' };
const convert = (markdown: string) => obsidianMarkdownToHtml(markdown, labels);
const file = (path: string, text: string, lastModified = Date.UTC(2026, 9, 1)): ImportFile => ({ path, size: new TextEncoder().encode(text).byteLength, lastModified, read: async () => text });
let sequence = 0;
const options = { dom: document, labels, newId: () => `id${++sequence}` };
const settings = { language: null, theme: 'system' as const, listStyle: 'top' as const, noteSort: 'manual' as const };

describe('Obsidian Markdown conversion', () => {
  it('keeps HTML tags as text instead of markup', () => {
    const { html } = convert('<img src=x onerror=alert(1)> **bold** <script>alert(1)</script>');
    expect(html).toBe('<p>&lt;img src=x onerror=alert(1)&gt; <strong>bold</strong> &lt;script&gt;alert(1)&lt;/script&gt;</p>');
    const template = document.createElement('template');
    template.innerHTML = html;
    expect(template.content.querySelector('img,script')).toBeNull();
  });

  it('links only http, https and mailto URLs', () => {
    const { html } = convert('[site](https://example.com/a_b_c) [mail](mailto:a@example.com) [bad](javascript:alert(1)) [rel](notes/a.md) <https://example.com>');
    expect(html).toContain('<a href="https://example.com/a_b_c">site</a>');
    expect(html).toContain('<a href="mailto:a@example.com">mail</a>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain(' bad ');
    expect(html).toContain(' rel ');
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
    expect(safeLinkUrl('https://user:pass@example.com')).toBeNull();
  });

  it('turns wiki links into their display text and embeds into labels', () => {
    const result = convert('See [[Project plan]] and [[Daily#Tasks|today]].\n![[photo.png]] ![[Other note]] ![alt text](assets/a.jpg)');
    expect(result.html).toBe('<p>See Project plan and today.</p><p>[Image: photo.png] [File: Other note] [Image: alt text]</p>');
    expect(result.embeds).toBe(3);
  });

  it('removes frontmatter and keeps its tags at the end', () => {
    const result = convert('---\ntitle: x\ntags:\n  - work\n  - "#idea"\naliases: [a]\n---\nBody #inline\n');
    expect(result.tags).toEqual(['work', 'idea']);
    expect(result.html).toBe('<p>Body #inline</p><p>#work #idea</p>');
    expect(convert('---\ntags: [a, b]\n---\n').html).toBe('<p>#a #b</p>');
  });

  it('converts callouts to quotes and strips highlights', () => {
    expect(convert('> [!warning]- Careful\n> Use ==backups==').html).toBe('<blockquote><p>Warning: Careful</p><p>Use backups</p></blockquote>');
  });

  it('keeps math, Mermaid and Dataview as code blocks', () => {
    const { html } = convert('$$\na < b\n$$\n```mermaid\ngraph TD; A-->B\n```\n```dataview\nLIST\n```');
    expect(html).toBe('<pre><code class="language-latex">a &lt; b</code></pre><pre><code class="language-mermaid">graph TD; A--&gt;B</code></pre><pre><code class="language-dataview">LIST</code></pre>');
  });

  it('converts headings, lists, tasks, tables and rules into the editor schema', () => {
    const { html } = convert('# H1\n#### H4\n- a\n  - nested\n1. one\n2) two\n- [ ] todo\n- [x] done\n---\n| A | B |\n| --- | :-: |\n| 1 | <b>2</b> |');
    expect(html).toContain('<h1>H1</h1><h3>H4</h3><ul><li><p>a</p></li><li><p>nested</p></li></ul><ol start="1">');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('<hr>');
    expect(html).toContain('<tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>&lt;b&gt;2&lt;/b&gt;</p></td></tr>');
  });
});

describe('Obsidian import plan', () => {
  it('maps root files and top-level folders to trays and skips hidden and unsupported files', async () => {
    const plan = await planObsidianImport([
      file('Vault/Work/2026/Deep.md', '# Deep'),
      file('Vault/Root.md', 'root'),
      file('Vault/Work/Plan.md', '[[Root]]'),
      file('Vault/.obsidian/app.json', '{}'),
      file('Vault/assets/photo.png', 'x'),
    ], options);
    expect(plan.vaultName).toBe('Vault');
    expect(plan.groups.map(group => group.name)).toEqual(['Vault', 'Vault / Work']);
    expect(plan.notes.map(note => note.title)).toEqual(['Root', 'Deep', 'Plan']);
    expect(plan.notes[1].group).toBe(plan.groups[1].id);
    expect(plan.notes[0].createdAt).toBe('2026-10-01T00:00:00.000Z');
    expect(plan.skipped).toEqual([{ path: 'Vault/assets/photo.png', reason: 'unsupported' }]);
  });

  it('puts loose files into one tray and skips files above the memo size limit', async () => {
    const huge = 'x'.repeat(CLOUD_LIMITS.documentBytes);
    const plan = await planObsidianImport([file('a.md', 'a'), file('huge.md', huge), file('raw.md', 'y'.repeat(3 * 1024 * 1024))], options);
    expect(plan.groups.map(group => group.name)).toEqual(['Obsidian']);
    expect(plan.notes.map(note => note.title)).toEqual(['a']);
    expect(plan.skipped.map(item => [item.path, item.reason])).toEqual([['huge.md', 'tooLarge'], ['raw.md', 'tooLarge']]);
  });

  it('produces notes that pass the stored workspace validator', async () => {
    const plan = await planObsidianImport([file('V/a.md', '- [ ] x\n| a |\n| --- |\n| <i>b</i> |\n[l](https://e.com)')], options);
    const backup = createWorkspaceBackup({ notes: plan.notes, groups: plan.groups, settings }, document);
    expect(backup.notes).toHaveLength(1);
  });

  it('splits saves by note count and bytes and rejects workspaces over the limits', async () => {
    const plan = await planObsidianImport(Array.from({ length: 5 }, (_, index) => file(`V/n${index}.md`, 'text')), options);
    expect(importBatches(plan, { notes: 2, bytes: 1e9 }).map(batch => batch.length)).toEqual([2, 2, 1]);
    const one = plan.noteBytes.get(plan.notes[0].id)!;
    expect(importBatches(plan, { notes: 100, bytes: one * 3 }).map(batch => batch.length)).toEqual([3, 2]);
    expect(importBatches({ ...plan, notes: Array(801).fill(plan.notes[0]) }).map(batch => batch.length)).toEqual([350, 350, 101]);
    expect(checkImportLimits({ notes: [], groups: [], settings }, plan, document)).toBeNull();
    const many = Array.from({ length: 9998 }, (_, index) => ({ ...plan.notes[0], id: `existing-${index}` }));
    expect(checkImportLimits({ notes: many, groups: plan.groups, settings }, plan, document)).toBe('notes');
  });
});

describe('Obsidian import saving', () => {
  it('keeps every queued save below the cloud change limit and resumes after a failure', async () => {
    const plan = await planObsidianImport(Array.from({ length: 801 }, (_, index) => file(`V/n${index}.md`, `memo ${index}`)), options);
    let failNext = true;
    const writes: number[] = [];
    // Mirrors cloudWorkspace.save: count changed memos against CLOUD_LIMITS.changedNotes.
    const save = async (value: WorkspaceBackup, base: SavedWorkspace | null): Promise<SavedWorkspace> => {
      const previous = new Set((base?.backup.notes ?? []).map(note => note.id));
      const changed = value.notes.filter(note => !previous.has(note.id)).length;
      if (changed > CLOUD_LIMITS.changedNotes) throw new WorkspaceStorageError('Too many changes in one save');
      if (writes.length === 1 && failNext) { failNext = false; throw new WorkspaceStorageError('Simulated outage'); }
      writes.push(changed);
      return { uid: 'u', revision: (base?.revision ?? 0) + 1, backup: value };
    };
    const queue = new WorkspaceSaveQueue(null, save, () => {});
    const state = { notes: [] as typeof plan.notes, groups: [] as typeof plan.groups, settings };
    const saveBatch = async (batch: typeof plan.notes, groups: typeof plan.groups) => {
      state.notes = [...state.notes, ...batch]; state.groups = [...state.groups, ...groups];
      queue.enqueue(createWorkspaceBackup(state, document), true);
      await queue.flush();
      return !queue.dirty && queue.status === 'saved';
    };
    const batches = importBatches(plan);
    expect(await saveBatch(batches[0], plan.groups)).toBe(true);
    expect(await saveBatch(batches[1], [])).toBe(false);
    expect(queue.status).toBe('error');
    await queue.retry();
    expect(queue.status).toBe('saved');
    expect(await saveBatch(batches[2], [])).toBe(true);
    expect(writes).toEqual([350, 350, 101]);
    await expect(save(createWorkspaceBackup({ ...state, notes: plan.notes }, document), null)).rejects.toThrow('Too many changes');
  }, 60000);
});
