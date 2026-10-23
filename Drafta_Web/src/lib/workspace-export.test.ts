/** @vitest-environment jsdom */
import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { editorHtmlToDocument } from './document-codec';
import { BackupValidationError } from './workspace-backup';
import { planEvernoteImport } from './evernote-import';
import { createNoteSource, LAZY_CONTENT } from './note-source';
import { planNotionImport } from './notion-import';
import { planObsidianImport, type ImportFile } from './obsidian-import';
import type { Group, Note } from './types';
import { blocksToEnml, blocksToMarkdown, collectExport, exportWorkspace, safeFileName, trayToEnex, type ExportTray } from './workspace-export';
import { listZip, readZipEntry } from './zip';

const labels = { untitledMemo: 'Untitled Memo', untitledTray: 'Untitled Tray' };
const blocks = (html: string): JSONContent[] => editorHtmlToDocument(`<h1>t</h1>${html}`, document).document.content!.slice(1);
const markdown = (html: string) => blocksToMarkdown(blocks(html)).join('\n');
const created = '2026-01-02T03:04:05.000Z';
const updated = '2026-10-23T01:02:03.000Z';
const memo = (title: string, html: string) => ({ title, createdAt: created, updatedAt: updated, blocks: blocks(html) });

async function unzip(blob: Blob) {
  const entries = await listZip(blob);
  return Object.fromEntries(await Promise.all(entries.map(async entry => [entry.path, new TextDecoder().decode(await readZipEntry(blob, entry, 1 << 22))] as const)));
}
const zipImport = (blob: Blob, path: string): ImportFile => ({ path, size: blob.size, lastModified: Date.now(), read: () => blob.text(), blob });

describe('Markdown export', () => {
  it('writes headings, lists, tasks, quotes, code, rules and links', () => {
    expect(markdown('<h2>Head</h2><p>Text <strong>bold</strong> <em>it</em> <s>gone</s> <code>a`b</code> <a href="https://example.com/a b">link</a></p>'))
      .toBe('## Head\n\nText **bold** *it* ~~gone~~ ``a`b`` [link](https://example.com/a%20b)');
    expect(markdown('<ul><li><p>one</p><ul><li><p>nested</p></li></ul></li><li><p>two</p></li></ul>')).toBe('- one\n\n  - nested\n- two');
    expect(markdown('<ol start="3"><li><p>c</p></li><li><p>d</p></li></ol>')).toBe('3. c\n4. d');
    expect(markdown('<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li><li data-type="taskItem" data-checked="false"><p>open</p></li></ul>'))
      .toBe('- [x] done\n- [ ] open');
    expect(markdown('<blockquote><p>quoted</p><p>more</p></blockquote>')).toBe('> quoted\n>\n> more');
    expect(markdown('<pre><code class="language-js">const s = "```";</code></pre><hr>')).toBe('````js\nconst s = "```";\n````\n\n***');
    expect(markdown('<p>line<br>next</p>')).toBe('line\nnext');
  });

  it('keeps spaces outside emphasis and escapes text that would become Markdown or HTML', () => {
    expect(markdown('<p><strong>bold </strong>plain</p>')).toBe('**bold** plain');
    expect(markdown('<p>&lt;script&gt;alert(1)&lt;/script&gt; #tag *x* [a](b) $5 ==hi== a|b</p>'))
      .toBe('\\<script\\>alert(1)\\</script\\> \\#tag \\*x\\* \\[a\\](b) \\$5 \\=\\=hi\\=\\= a\\|b');
    expect(markdown('<p>1. not a list</p><p>- not a bullet</p>')).toBe('1\\. not a list\n\n\\- not a bullet');
    // Typed leading spaces (the HTML parser would collapse them) must not start a code block.
    expect(blocksToMarkdown([{ type: 'paragraph', content: [{ type: 'text', text: '    not code' }] }])).toEqual(['    not code']);
  });

  it('writes tables with a header row, escaped pipes and filled spans', () => {
    expect(markdown('<table><tbody><tr><th colspan="2"><p>a|b</p></th></tr><tr><td><p>1</p><p>2</p></td><td><p></p></td></tr></tbody></table>'))
      .toBe('| a\\|b |   |\n| --- | --- |\n| 1<br>2 |   |');
  });
});

describe('ENEX export', () => {
  it('writes well-formed ENML with to-dos, colors and safe links only', () => {
    const enml = blocksToEnml(blocks('<p><span style="color: #64A364">green</span> <a href="https://e.com/?a=1&amp;b=2">ok</a> <a href="#x">anchor</a></p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li></ul><pre><code>a &lt; b</code></pre><p></p>'));
    expect(enml).toContain('<span style="color:rgb(100, 163, 100)">green</span>');
    expect(enml).toContain('<a href="https://e.com/?a=1&amp;b=2">ok</a>');
    expect(enml).not.toContain('href="#x"');
    expect(enml).toContain('<div><en-todo checked="true"/>done</div>');
    expect(enml).toContain('<pre>a &lt; b</pre>');
    expect(enml).toContain('<div><br/></div>');
    const parsed = new DOMParser().parseFromString(`<en-note>${enml}</en-note>`, 'application/xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('keeps the CDATA intact when the text contains "]]>" and drops characters XML cannot hold', () => {
    const file = trayToEnex([memo('A\u0001 title', '<p>end ]]&gt; here</p>')], labels, updated);
    const parsed = new DOMParser().parseFromString(file, 'application/xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(parsed.querySelector('title')!.textContent).toBe('A title');
    expect(parsed.querySelector('content')!.textContent).toContain('end ]]&gt; here');
    expect(parsed.querySelector('created')!.textContent).toBe('20260102T030405Z');
  });
});

describe('export files', () => {
  it('writes rules so that a memo starting with one is not read as frontmatter, and escapes lines that would underline a heading', async () => {
    const trays: ExportTray[] = [{ name: 'Rules', memos: [memo('Ruled', '<hr><p>foo</p><hr>')] }];
    const vault = await unzip((await exportWorkspace('obsidian', trays, labels)).blob);
    expect(vault['Drafta/Rules/Ruled.md']).toBe('***\n\nfoo\n\n***\n');
    const back = await planObsidianImport([zipImport((await exportWorkspace('obsidian', trays, labels)).blob, 'v.zip')], { dom: document, newId: () => crypto.randomUUID(), listStyle: 'top', labels: { image: 'I', file: 'F', vault: 'V' } });
    expect(back.notes[0].content).toContain('foo');
    expect(markdown('<p>text<br>---</p><p>title<br>=</p><p>more<br>--</p><p>- - -</p>')).toBe('text\n\\---\n\ntitle\n\\=\n\nmore\n\\--\n\n\\- - -');
  });

  it('avoids Windows device names with extensions, hidden names and long paths', async () => {
    expect(safeFileName('nul.txt', 'x')).toBe('nul_.txt');
    expect(safeFileName('CONIN$', 'x')).toBe('CONIN$_');
    expect(safeFileName('COM¹', 'x')).toBe('COM¹_');
    expect(safeFileName('Lpt3.backup.md', 'x')).toBe('Lpt3_.backup.md');
    expect(safeFileName('console', 'x')).toBe('console');
    expect(safeFileName('.hidden', 'x')).toBe('hidden');
    expect(safeFileName(' . ', 'Untitled')).toBe('Untitled');
    expect(safeFileName('😀'.repeat(50), 'x')).toBe('😀'.repeat(40));
    const long = 'あ'.repeat(300);
    const paths = Object.keys(await unzip((await exportWorkspace('notion', [{ name: long, memos: [memo(long, '<p>x</p>'), memo(long, '<p>y</p>')] }], labels)).blob));
    expect(paths).toEqual([`Drafta/${'あ'.repeat(40)}/${'あ'.repeat(80)}.md`, `Drafta/${'あ'.repeat(40)}/${'あ'.repeat(80)} 2.md`]);
    expect(Math.max(...paths.map(path => path.length))).toBeLessThanOrEqual(140);
  });

  it('makes file names safe and unique', () => {
    expect(safeFileName('a/b:c*?"<>|#^[]', 'x')).toBe('a_b_c__________');
    expect(safeFileName('  CON ', 'x')).toBe('CON_');
    expect(safeFileName('...', 'Untitled')).toBe('Untitled');
    expect(safeFileName('x'.repeat(300), 'x')).toHaveLength(80);
  });

  it('builds a vault, a Notion import and ENEX files, leaving out empty trays', async () => {
    const trays: ExportTray[] = [
      { name: 'Work', memos: [memo('Plan', '<p>Body</p>'), memo('plan', '<p>Other</p>'), memo('', '<p>Nameless</p>')] },
      { name: 'Work', memos: [memo('Second tray', '<p>x</p>')] },
      { name: 'Empty', memos: [] },
    ];
    const obsidian = await exportWorkspace('obsidian', trays, labels, new Date(2026, 9, 23));
    expect(obsidian.fileName).toBe('Drafta-obsidian-2026-10-23.zip');
    expect(obsidian.memos).toBe(4);
    const vault = await unzip(obsidian.blob);
    expect(Object.keys(vault)).toEqual(['Drafta/Work/Plan.md', 'Drafta/Work/plan 2.md', 'Drafta/Work/Untitled Memo.md', 'Drafta/Work 2/Second tray.md']);
    expect(vault['Drafta/Work/Plan.md']).toBe('Body\n');
    expect((await listZip(obsidian.blob))[0].lastModified).toBe(Date.parse(updated));
    const notion = await unzip((await exportWorkspace('notion', trays, labels)).blob);
    expect(notion['Drafta/Work/Plan.md']).toBe('# Plan\n\nBody\n');
    expect(notion['Drafta/Work/Untitled Memo.md']).toBe('# Untitled Memo\n\nNameless\n');
    const evernote = await unzip((await exportWorkspace('evernote', trays, labels)).blob);
    expect(Object.keys(evernote)).toEqual(['Work.enex', 'Work 2.enex']);
    expect(evernote['Work.enex']).toContain('<title>Untitled Memo</title>');
  });

  it('collects trays and memos that are not deleted, using stored bodies of unopened memos', () => {
    const groups: Group[] = [{ id: 'g1', name: 'Tray', type: 'group' }, { id: 'g2', name: 'Gone', type: 'group', isDeleted: true }, { id: 's', name: '', type: 'separator' }];
    const document = editorHtmlToDocument('<h1>Lazy</h1><p>stored body</p>', window.document);
    const base = { stars: 0 as const, createdAt: created, updatedAt: updated };
    const lazy: Note = { ...base, id: 'n2', title: 'Lazy', group: 'g1', content: LAZY_CONTENT,
      source: createNoteSource({ id: 'n2', group: 'g1', ...base, document }, 'Lazy') };
    const notes: Note[] = [
      { ...base, id: 'n1', title: '{color:#64A364}Colored{/color} title', content: '<p>open body</p>', group: 'g1' },
      lazy,
      { ...base, id: 'n3', title: 'Deleted', content: '<p>x</p>', group: 'g1', isDeleted: true },
      { ...base, id: 'n4', title: 'In deleted tray', content: '<p>x</p>', group: 'g2' },
    ];
    const trays = collectExport({ notes, groups }, window.document);
    expect(trays.map(tray => tray.name)).toEqual(['Tray']);
    expect(trays[0].memos.map(item => item.title)).toEqual(['Colored title', 'Lazy']);
    expect(blocksToMarkdown(trays[0].memos[1].blocks)).toEqual(['stored body']);
  });

  it('checks a cached body before using it and stops on a bad one', () => {
    const base = { stars: 0 as const, createdAt: created, updatedAt: updated };
    const document = editorHtmlToDocument('<h1>Bad</h1><p>x</p>', window.document);
    const paragraph = document.document.content![1];
    paragraph.content = [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }];
    const bad: Note = { ...base, id: 'n9', title: 'Bad', group: 'g1', content: LAZY_CONTENT, source: createNoteSource({ id: 'n9', group: 'g1', ...base, document }, 'Bad') };
    expect(() => collectExport({ notes: [bad], groups: [{ id: 'g1', name: 'Tray', type: 'group' }] }, window.document)).toThrow(BackupValidationError);
  });
});

describe('export and import again', () => {
  const trays: ExportTray[] = [{ name: 'Round', memos: [memo('Trip', '<h2>Head</h2><p>Text <strong>bold</strong> &lt;b&gt;</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li></ul>')] }];
  const importOptions = { dom: document, newId: () => crypto.randomUUID(), listStyle: 'top' as const };
  const importLabels = { image: 'Image', file: 'File', vault: 'Obsidian', encrypted: 'Encrypted', notion: 'Notion', evernote: 'Evernote' };

  it('reads its own Obsidian vault, Notion import and ENEX files back', async () => {
    const vault = await planObsidianImport([zipImport((await exportWorkspace('obsidian', trays, labels)).blob, 'Drafta-obsidian.zip')], { ...importOptions, labels: importLabels });
    expect(vault.groups.map(group => group.name)).toEqual(['Drafta / Round']);
    expect(vault.notes[0].title).toBe('Trip');
    expect(vault.notes[0].content).toContain('Text <strong>bold</strong> &lt;b&gt;');
    expect(vault.notes[0].updatedAt).toBe(updated);
    const notion = await planNotionImport([zipImport((await exportWorkspace('notion', trays, labels)).blob, 'Drafta-notion.zip')], { ...importOptions, labels: importLabels });
    expect(notion.notes[0].title).toBe('Trip');
    expect(notion.notes[0].content).toContain('data-checked="true"');
    const evernote = await planEvernoteImport([zipImport((await exportWorkspace('evernote', trays, labels)).blob, 'Drafta-evernote.zip')], { ...importOptions, labels: importLabels });
    expect(evernote.groups.map(group => group.name)).toEqual(['Round']);
    expect(evernote.notes[0].title).toBe('Trip');
    expect(evernote.notes[0].createdAt).toBe(created);
    expect(evernote.notes[0].updatedAt).toBe(updated);
    expect(evernote.notes[0].content).toContain('<h2>Head</h2>');
    expect(evernote.notes[0].content).toContain('<strong>bold</strong> &lt;b&gt;');
    expect(evernote.notes[0].content).toMatch(/data-checked="true".*done/);
  });
});
