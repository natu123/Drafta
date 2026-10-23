/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { importedHtmlToDrafta, parseInertHtml } from './imported-html';
import { notionMarkdown, parseCsv, planNotionImport, stripNotionId, type NotionPlanOptions } from './notion-import';
import { buildImportedNote, type ImportFile } from './obsidian-import';
import { createZip } from './zip';

const labels = { image: 'Image', file: 'File', vault: 'Vault', encrypted: 'Encrypted', notion: 'Notion' };
let ids = 0;
const options: NotionPlanOptions = { dom: document, labels, newId: () => `id${++ids}`, listStyle: 'top' };
const ID = '0123456789abcdef0123456789abcdef';
const ID2 = 'fedcba9876543210fedcba9876543210';
const time = Date.UTC(2026, 9, 1);
const convert = (html: string) => importedHtmlToDrafta(parseInertHtml(html, document), { labels, counter: { embeds: 0 } });

const zipFile = async (name: string, entries: [string, string | Uint8Array][]) => {
  const blob = await createZip(entries.map(([path, data]) => ({ path, data, lastModified: time })));
  return { path: name, size: blob.size, lastModified: time, read: () => blob.text(), blob } satisfies ImportFile;
};
const looseFile = (path: string, text: string): ImportFile => ({ path, size: new TextEncoder().encode(text).byteLength, lastModified: time, read: async () => text });

describe('imported HTML', () => {
  it('rebuilds only allowed elements: no scripts, handlers, styles or unsafe links', () => {
    const html = convert(`<p onclick="x()" style="color:red" class="c" id="i">Hi <script>alert(1)</script><b onmouseover="y()">bold</b></p>
      <img src="x" onerror="alert(1)" alt="cat.png"><iframe src="https://evil.example/"></iframe><svg><script>alert(2)</script></svg>
      <a href="javascript:alert(3)">js</a> <a href="https://example.com/?q=1" target="_blank" onclick="z()">ok</a> <a href="data:text/html,x">data</a>
      <form action="https://evil.example"><input name="password"><button>Go</button></form><style>body{}</style><object data="a.swf"></object>`);
    expect(html).not.toMatch(/script|onerror|onclick|onmouseover|style=|class=|id=|javascript:|data:text|<img|<iframe|<form|<input|<button|<object/i);
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('[Image: cat.png]');
    expect(html).toContain('<a href="https://example.com/?q=1">ok</a>');
    expect(html).toContain('js');
    // The result is a valid stored memo.
    expect(buildImportedNote({ title: 't', html, group: { id: 'g', name: 'g', type: 'group' }, createdAt: new Date(time).toISOString(), updatedAt: new Date(time).toISOString() }, options)).not.toBeNull();
  });

  it('keeps deep nesting as text instead of recursing without bound', () => {
    // Far past the converter's bound (48); jsdom itself parses deeper trees slowly.
    const depth = 1000;
    const html = convert(`${'<div>'.repeat(depth)}deep text${'</div>'.repeat(depth)}`);
    expect(html).toContain('deep text');
  });

  it('converts Notion blocks: to-dos, toggles, callouts, code, equations and properties', () => {
    const html = convert(`<table class="properties"><tbody><tr><th>Status</th><td><span class="selected-value">Done</span></td></tr></tbody></table>
      <ul class="to-do-list"><li><div class="checkbox checkbox-on"></div> <span class="to-do-children-checked">Done task</span></li>
      <li><div class="checkbox checkbox-off"></div> <span>Open task</span></li></ul>
      <ul class="toggle"><li><details open=""><summary>Toggle head</summary><p>Toggle body</p></details></li></ul>
      <figure class="callout"><div style="font-size:1.5em"><span class="icon">💡</span></div><div style="width:100%">Callout text</div></figure>
      <pre class="code"><code class="language-Plain Text">line 1
line 2</code></pre><figure class="equation"><annotation encoding="application/x-tex">x^2</annotation></figure>
      <nav class="table_of_contents"><a href="#a">TOC</a></nav><p>Inline <mark class="highlight-red">mark</mark></p>`);
    expect(html).toContain('<p>Status: Done</p>');
    expect(html).toContain('data-type="taskList"');
    expect(html).toMatch(/data-checked="true".*Done task/);
    expect(html).toMatch(/data-checked="false".*Open task/);
    expect(html).toContain('Toggle head');
    expect(html).toContain('<blockquote><p>💡 Callout text</p></blockquote>');
    expect(html).toContain('<pre><code class="language-plaintext">line 1\nline 2</code></pre>');
    expect(html).toContain('<pre><code class="language-latex">x^2</code></pre>');
    expect(html).not.toContain('TOC');
    expect(html).toContain('<p>Inline mark</p>');
  });

  it('keeps nested lists to a bounded depth and turns oversized tables into rows of text', () => {
    const nested = `${'<ul><li>level'.repeat(10)}${'</li></ul>'.repeat(10)}`;
    const lists = convert(nested);
    expect((lists.match(/<ul>/g) ?? []).length).toBe(6);
    expect((lists.match(/level/g) ?? []).length).toBe(10);
    const rows = Array.from({ length: 120 }, (_, row) => `<tr>${Array.from({ length: 10 }, (_, column) => `<td>r${row}c${column}</td>`).join('')}</tr>`).join('');
    const table = convert(`<table>${rows}</table>`);
    expect(table).not.toContain('<table>');
    expect(table).toContain('<p>r0c0 | r0c1 | r0c2');
    const small = convert('<table><tr><th>a</th></tr><tr><td>b</td><td>c</td></tr></table>');
    expect(small).toBe('<table><tbody><tr><th><p>a</p></th><td><p></p></td></tr><tr><td><p>b</p></td><td><p>c</p></td></tr></tbody></table>');
  });
});

describe('Notion Markdown', () => {
  it('takes the title line and turns callouts and toggles into text', () => {
    const { title, body } = notionMarkdown(`\n# Weekly notes\n\nStatus: Done\n\n<aside>\n<img src="https://www.notion.so/icons/x.svg" alt="x" width="40px" />\n\n💡 Remember this\n\n</aside>\n\n<details>\n<summary>More</summary>\n\nHidden\n</details>\n| a<br>b | c |`);
    expect(title).toBe('Weekly notes');
    expect(body).toContain('Status: Done');
    expect(body).toContain('> 💡 Remember this');
    expect(body).not.toMatch(/<aside>|<img|<details>|<summary>/);
    expect(body).toContain('More');
    expect(body).toContain('| a b | c |');
  });

  it('parses quoted CSV fields with commas, quotes and line breaks', () => {
    expect(parseCsv('﻿Name,Tags\n"A, B","say ""hi""\nthere"\nC,\n')).toEqual([['Name', 'Tags'], ['A, B', 'say "hi"\nthere'], ['C', '']]);
  });

  it('removes the page ID from names', () => {
    expect(stripNotionId(`Project ${ID}`)).toBe('Project');
    expect(stripNotionId('Project 01234567-89ab-cdef-0123-456789abcdef')).toBe('Project');
    expect(stripNotionId(ID)).toBe(ID);
  });
});

describe('Notion import', () => {
  it('maps a Markdown & CSV export to trays: page trees get their own tray, single pages share "Notion"', async () => {
    const file = await zipFile('Export.zip', [
      [`Project ${ID}.md`, `# Project\n\nIntro [Sub](Project%20${ID}/Sub%20${ID2}.md) ![diagram.png](Project%20${ID}/diagram.png)`],
      [`Project ${ID}/Sub ${ID2}.md`, '# Sub page\n\n- [x] done\n- [ ] open'],
      [`Project ${ID}/diagram.png`, new Uint8Array([137, 80, 78, 71])],
      [`Single ${ID2}.md`, '# Single\n\n[evil](javascript:alert(1)) <script>alert(1)</script>'],
      [`Tasks ${ID}.csv`, 'Name,Status\nOld,View only\n'],
      [`Tasks ${ID}_all.csv`, 'Name,Status\nA,Done\nB,Open\n'],
      [`Tasks ${ID}/A ${ID2}.md`, '# A\n\nStatus: Done'],
      ['__MACOSX/._Project.md', 'junk'],
    ]);
    const plan = await planNotionImport([file], options);
    expect(plan.groups.map(group => group.name)).toEqual(['Notion', 'Notion / Project', 'Notion / Tasks']);
    const titles = (name: string) => plan.notes.filter(note => note.group === plan.groups.find(group => group.name === name)!.id).map(note => note.title);
    expect(titles('Notion')).toEqual(['Single']);
    expect(titles('Notion / Project')).toEqual(['Project', 'Sub page']);
    expect(titles('Notion / Tasks')).toEqual(['Tasks', 'A']);
    const table = plan.notes.find(note => note.title === 'Tasks')!;
    expect(table.content).toContain('<p>Name</p></th>');
    expect(table.content).toContain('Done');
    expect(table.content).not.toContain('View only');
    const single = plan.notes.find(note => note.title === 'Single')!;
    expect(single.content).not.toMatch(/<script|javascript:|<a /);
    expect(single.content).toContain('&lt;script&gt;');
    expect(plan.notes.find(note => note.title === 'Sub page')!.content).toContain('data-type="taskList"');
    expect(plan.embeds).toBe(1);
    expect(plan.skipped).toEqual([{ path: `Export.zip/Project ${ID}/diagram.png`, reason: 'unsupported' }]);
  });

  it('reads the HTML export: title, emoji icon, properties and body, without the page style', async () => {
    const page = `<html><head><meta charset="utf-8"/><title>Ignored</title><style>body{color:red}</style></head><body><article class="page sans"><header>
      <div class="page-header-icon"><span class="icon">🚀</span></div><h1 class="page-title">Launch plan</h1>
      <table class="properties"><tbody><tr class="property-row"><th>Owner</th><td>Gles</td></tr></tbody></table></header>
      <div class="page-body"><h2>Goals</h2><p>Ship <strong>it</strong> <a href="https://drafta-memo.com">site</a></p>
      <figure class="link-to-page"><a href="Child%20${ID2}.html"><span class="icon">📄</span>Child</a></figure>
      <script>alert(1)</script></div></article></body></html>`;
    const file = await zipFile('Export.zip', [[`Export-01234567-89ab-cdef-0123-456789abcdef/Launch ${ID}.html`, page]]);
    const plan = await planNotionImport([file], options);
    expect(plan.groups.map(group => group.name)).toEqual(['Notion']);
    const [note] = plan.notes;
    expect(note.title).toBe('Launch plan');
    expect(note.icon).toBe('🚀');
    expect(note.content).toContain('<p>Owner: Gles</p>');
    expect(note.content).toContain('<h2>Goals</h2>');
    expect(note.content).toContain('href="https://drafta-memo.com">site</a>');
    expect(note.content).toContain('Child');
    expect(note.content).not.toMatch(/color:red|alert|Ignored|<a href="Child/);
  });

  it('keeps imported HTML in an inert document (no element of the page is created to hold it)', async () => {
    const created: string[] = [];
    const original = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string, init?: ElementCreationOptions) => { created.push(tag); return original(tag, init); }) as typeof document.createElement);
    try {
      const page = `<div class="page-body"><img src="https://invalid.invalid/x.png" onerror="alert(1)"><p>text</p></div>`;
      const plan = await planNotionImport([looseFile(`Hostile ${ID}.html`, page)], options);
      expect(plan.notes[0].content).toBe('<p>[Image: x.png]</p><p>text</p>');
    } finally { spy.mockRestore(); }
    // Only templates, whose content is inert, are made in the page's document.
    expect(new Set(created)).toEqual(new Set(['template']));
  });

  it('opens split parts inside the export, stored or compressed, and part files chosen directly', async () => {
    const part1 = await createZip([{ path: `A ${ID}.md`, data: '# A', lastModified: time }]);
    const part2 = await createZip([{ path: `B ${ID2}.md`, data: '# B\n\n' + 'text '.repeat(200), lastModified: time }]);
    const outer = await zipFile('Download.zip', [
      ['Export-1-Part-1.zip', new Uint8Array(await part1.arrayBuffer())],
      ['Export-1-Part-2.zip', new Uint8Array(await part2.arrayBuffer())],
      ['deeper/Part-3.zip', new Uint8Array(await part1.arrayBuffer())],
    ]);
    const plan = await planNotionImport([outer], options);
    expect(plan.notes.map(note => note.title).sort()).toEqual(['A', 'B']);
    expect(plan.skipped).toEqual([{ path: 'Download.zip/deeper/Part-3.zip', reason: 'unsupported' }]);
    const direct = await planNotionImport([await zipFile('Part-1.zip', [[`A ${ID}.md`, '# A']]), await zipFile('Part-2.zip', [[`B ${ID2}.md`, '# B']])], options);
    expect(direct.notes.map(note => note.title)).toEqual(['A', 'B']);
  });

  it('accepts an extracted folder and reports broken or oversized files without failing the import', async () => {
    const plan = await planNotionImport([
      looseFile(`Export-01234567-89ab-cdef-0123-456789abcdef/Fine ${ID}.md`, '# Fine'),
      looseFile(`Export-01234567-89ab-cdef-0123-456789abcdef/Huge ${ID2}.md`, 'x'.repeat(3 * 1024 * 1024)),
    ], options);
    expect(plan.notes.map(note => note.title)).toEqual(['Fine']);
    expect(plan.skipped).toEqual([{ path: `Export-01234567-89ab-cdef-0123-456789abcdef/Huge ${ID2}.md`, reason: 'tooLarge' }]);
    const broken = await planNotionImport([{ path: 'broken.zip', size: 10, lastModified: time, read: async () => '', blob: new Blob(['not a zip']) }], options);
    expect(broken.notes).toEqual([]);
    expect(broken.skipped).toEqual([{ path: 'broken.zip', reason: 'invalid' }]);
  });
});
