/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { editorDocumentToHtml, editorHtmlToDocument } from './document-codec';
import { enexNotes, enmlFragment, planEvernoteImport } from './evernote-import';
import { expandArchives } from './import-archive';
import { notionMarkdown, planNotionImport } from './notion-import';
import { buildImportedNote, createImportBudget, obsidianMarkdownToHtml, type ImportFile, type SkippedFile } from './obsidian-import';
import { createZip, listZip, readZipEntry, ZipError } from './zip';

// Pre-release review (specs/20): resource limits and linear parsing for hostile files.
const time = Date.UTC(2026, 9, 1);
const labels = { image: 'Image', file: 'File', vault: 'Vault', encrypted: 'Encrypted', notion: 'Notion', evernote: 'Evernote' };
let ids = 0;
const options = { dom: document, labels, newId: () => `id${++ids}`, listStyle: 'top' as const };
const zipBlob = (entries: [string, string | Uint8Array][]) => createZip(entries.map(([path, data]) => ({ path, data, lastModified: time })));
const zipFile = (path: string, blob: Blob): ImportFile => ({ path, size: blob.size, lastModified: time, read: () => blob.text(), blob });
const looseFile = (path: string, text: string): ImportFile => ({ path, size: new TextEncoder().encode(text).byteLength, lastModified: time, read: async () => text });
const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
async function failure(promise: Promise<unknown>) {
  try { await promise; } catch (error) { return error instanceof ZipError ? error.reason : (error as Error).name; }
  return 'none';
}
async function elapsed(run: () => unknown) {
  const start = performance.now();
  await run();
  return performance.now() - start;
}

describe('archive limits', () => {
  it('rejects an archive whose entries share their data (overlapping zip bomb)', async () => {
    const bytes = await bytesOf(await zipBlob([['a.md', 'one'], ['b.md', 'two']]));
    const view = new DataView(bytes.buffer);
    const directory = view.getUint32(bytes.length - 22 + 16, true);
    const second = directory + 46 + view.getUint16(directory + 28, true) + view.getUint16(directory + 30, true) + view.getUint16(directory + 32, true);
    view.setUint32(second + 42, view.getUint32(directory + 42, true), true);
    expect(await failure(listZip(new Blob([bytes])))).toBe('invalid');
  });

  it('counts entries of nested archives against one budget and stops opening parts once it is spent', async () => {
    const part = (name: string) => zipBlob(Array.from({ length: 4 }, (_, index) => [`${name}-${index}.md`, `# ${index}`] as [string, string]));
    const outer = await zipBlob(await Promise.all(['p1', 'p2', 'p3', 'p4'].map(async name => [`${name}.zip`, await bytesOf(await part(name))] as [string, Uint8Array])));
    const skipped: SkippedFile[] = [];
    const budget = { ...createImportBudget(), entries: 4 + 4 + 4 };
    const files = await expandArchives([zipFile('outer.zip', outer)], skipped, budget);
    expect(files).toHaveLength(8);
    expect(skipped).toEqual([{ path: 'outer.zip/p3.zip', reason: 'tooLarge' }, { path: 'outer.zip/p4.zip', reason: 'tooLarge' }]);
  });

  it('shares one decompression budget across entries and files', async () => {
    const blob = await zipBlob([['a.md', 'a'.repeat(3000)], ['b.md', 'b'.repeat(3000)]]);
    const [first, second] = await listZip(blob);
    const budget = { inflated: 5000 };
    expect((await readZipEntry(blob, first, 1 << 20, budget)).byteLength).toBe(3000);
    expect(budget.inflated).toBe(2000);
    expect(await failure(readZipEntry(blob, second, 1 << 20, budget))).toBe('tooLarge');
    // An ENEX inside a ZIP is streamed from the same budget.
    const enex = await zipBlob([['big.enex', `<en-export>${'<note><title>x</title><content><![CDATA[<en-note>y</en-note>]]></content></note>'.repeat(200)}</en-export>`]]);
    const [file] = await expandArchives([zipFile('e.zip', enex)], [], { ...createImportBudget(), inflated: 4000 });
    const read = async () => { for await (const note of enexNotes(file.stream!())) void note; };
    expect(await failure(read())).toBe('tooLarge');
  });

  it('holds compressed nested archives within one memory limit', async () => {
    const inner = await zipBlob(Array.from({ length: 200 }, (_, index) => [`n${index}.md`, 'x'] as [string, string]));
    const outer = await zipBlob([['part.zip', await bytesOf(inner)]]);
    expect((await listZip(outer))[0].method).toBe(8);
    const skipped: SkippedFile[] = [];
    await expandArchives([zipFile('outer.zip', outer)], skipped, { ...createImportBudget(), nested: 100 });
    expect(skipped).toEqual([{ path: 'outer.zip/part.zip', reason: 'tooLarge' }]);
  });

  it('stops reading an ENEX file when the reader stops, and stops planning when cancelled', async () => {
    let pulls = 0;
    let cancelled = false;
    const chunk = new TextEncoder().encode('<note><title>a</title><content><![CDATA[<en-note>b</en-note>]]></content></note>');
    const endless = new ReadableStream<Uint8Array>({ pull(controller) { pulls++; controller.enqueue(chunk); }, cancel() { cancelled = true; } });
    for await (const note of enexNotes(endless)) { expect(note).toContain('<title>a</title>'); break; }
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(5);
    const controller = new AbortController();
    controller.abort();
    const text = `<en-export>${'<note><title>x</title><content><![CDATA[<en-note>y</en-note>]]></content></note>'.repeat(3)}</en-export>`;
    expect(await failure(planEvernoteImport([{ ...looseFile('a.enex', text), stream: () => new Blob([text]).stream?.() ?? new Response(text).body! }], { ...options, signal: controller.signal }))).toBe('AbortError');
  });
});

describe('table sizes', () => {
  it('turns a CSV that is wide or long into text without padding it first', async () => {
    const hostile = `a${','.repeat(1000000)}\n${'a\n'.repeat(500000)}`;
    let plan!: Awaited<ReturnType<typeof planNotionImport>>;
    expect(await elapsed(async () => { plan = await planNotionImport([looseFile('Hostile.csv', hostile)], options); })).toBeLessThan(5000);
    expect(plan.notes).toEqual([]);
    expect(plan.skipped).toEqual([{ path: 'Hostile.csv', reason: 'tooLarge' }]);
    const wide = await planNotionImport([looseFile('Wide.csv', `h${','.repeat(5000)}\n${'v\n'.repeat(100)}`)], options);
    expect(wide.notes[0].content).not.toContain('<table');
    expect(wide.notes[0].content).toContain('<p>v</p>');
  });

  it('keeps a huge Markdown table as rows of text without padding them', async () => {
    const markdown = `|${'h|'.repeat(100000)}\n|${'-|'.repeat(100000)}\n${'|a|\n'.repeat(1000)}`;
    let html = '';
    expect(await elapsed(() => { html = obsidianMarkdownToHtml(markdown, labels).html; })).toBeLessThan(3000);
    expect(html).not.toContain('<table');
    expect(html.split('<p>a</p>')).toHaveLength(1001);
  });
});

describe('linear parsing of long lines', () => {
  const twoMegabytes = (unit: string) => unit.repeat(Math.ceil(2 * 1024 * 1024 / unit.length));
  it.each([
    ['brackets', '['],
    ['image openers', '!['],
    ['image links without a close', '![](a'],
    ['wiki openers', '[['],
    ['link labels without a close', '[a]('],
    ['autolinks without a close', '<http://a'],
    ['emphasis openers', '**a'],
  ])('converts a 2 MB line of %s quickly', async (_, unit) => {
    expect(await elapsed(() => obsidianMarkdownToHtml(twoMegabytes(unit), labels))).toBeLessThan(3000);
  });

  it('pairs backtick runs of many lengths in one pass', async () => {
    const line = Array.from({ length: 60000 }, (_, index) => `${'`'.repeat(index % 40 + 1)}x`).join('');
    let html = '';
    expect(await elapsed(() => { html = obsidianMarkdownToHtml(line, labels).html; })).toBeLessThan(3000);
    expect(html).toContain('<code>');
  });

  it('reads a long Notion title line and long ENML garbage quickly', async () => {
    expect(await elapsed(() => notionMarkdown(`# a${' '.repeat(1000000)}b`))).toBeLessThan(1000);
    expect(notionMarkdown(`# a${' '.repeat(1000)}b`).title).toBe(`a${' '.repeat(1000)}b`);
    const enml = `${'<!DOCTYPE x'.repeat(50000)}${'<?xml a'.repeat(50000)}${'<a <a b="'.repeat(30000)}<en-note>ok</en-note>`;
    expect(await elapsed(() => enmlFragment(enml, document))).toBeLessThan(3000);
  });
});

describe('stored memo HTML', () => {
  it('keeps the HTML of the validated document, not the converter output', () => {
    const html = '<p>a <a href="https://example.com/">link</a></p><ul><li><p>x</p></li></ul>';
    const built = buildImportedNote({ title: 'T', html, group: { id: 'g', name: 'g', type: 'group' }, createdAt: new Date(time).toISOString(), updatedAt: new Date(time).toISOString() }, options)!;
    const template = document.createElement('template');
    template.innerHTML = editorDocumentToHtml(editorHtmlToDocument(`<h1>T</h1>${html}`, document), document);
    template.content.firstElementChild!.remove();
    expect(built.note.content).toBe(template.innerHTML);
    expect(built.note.content).not.toBe(html);
    expect(built.note.content).not.toContain('<h1>');
  });
});
