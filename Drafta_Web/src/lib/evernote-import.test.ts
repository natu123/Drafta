/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { enexNotes, parseEnexTime, planEvernoteImport, type EvernotePlanOptions } from './evernote-import';
import type { ImportFile } from './obsidian-import';
import { createZip } from './zip';

const labels = { image: 'Image', file: 'File', vault: 'Vault', encrypted: 'Encrypted', evernote: 'Evernote' };
let ids = 0;
const options: EvernotePlanOptions = { dom: document, labels, newId: () => `id${++ids}`, listStyle: 'top' };
const fileTime = Date.UTC(2026, 9, 1);

/** A stream that hands the text over in small pieces, to cross every tag boundary. */
const chunked = (text: string, size: number) => {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new ReadableStream<Uint8Array>({ pull(controller) {
    if (offset >= bytes.length) { controller.close(); return; }
    controller.enqueue(bytes.slice(offset, offset += size));
  } });
};
const enexFile = (path: string, text: string, size = 4096): ImportFile => ({
  path, size: new TextEncoder().encode(text).byteLength, lastModified: fileTime, read: async () => text, stream: () => chunked(text, size),
});
const note = (title: string, enml: string, extra = '') => `<note><title>${title}</title><content><![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${enml}</en-note>]]></content>${extra}</note>`;
const enex = (...notes: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">
<en-export export-date="20261023T000000Z" application="Evernote" version="10.0">
${notes.join('\n')}
</en-export>`;

describe('ENEX reading', () => {
  it('parses ENEX times as UTC and rejects malformed ones', () => {
    expect(parseEnexTime('20261023T123456Z')).toBe(Date.UTC(2026, 9, 23, 12, 34, 56));
    expect(parseEnexTime('20261332T000000Z')).toBeNull();
    expect(parseEnexTime('2026-10-23')).toBeNull();
  });

  it('cuts notes at any chunk size and skips attachment data', async () => {
    const data = 'QUFB'.repeat(5000);
    const text = enex(note('One', '<div>a</div>', `<resource><data encoding="base64">${data}</data><mime>image/png</mime></resource>`), note('Two', '<div>b</div>'));
    for (const size of [1, 7, 64, 100000]) {
      const notes: (string | null)[] = [];
      for await (const xml of enexNotes(chunked(text, size))) notes.push(xml);
      expect(notes).toHaveLength(2);
      expect(notes[0]).toContain('<title>One</title>');
      expect(notes[0]).not.toContain('QUFB');
      expect(notes[1]).toContain('<title>Two</title>');
    }
  });
});

describe('Evernote import', () => {
  it('turns each file into a tray and keeps dates, tags, checklists and tasks', async () => {
    const text = enex(
      note('Shopping', `<div><en-todo checked="true"/>Milk</div><div><en-todo/>Bread</div><div>Plain <b>bold</b> <span style="font-weight: bold;">styled</span></div>
        <div><br/></div><ul style="--en-todo:true;"><li style="--en-checked:true;"><div>Done item</div></li><li style="--en-checked:false;"><div>Open item</div></li></ul>
        <div style="--en-task-group:true; --en-id:group-1;"></div><div>after tasks</div>`,
      `<created>20240101T090000Z</created><updated>20240102T100000Z</updated><tag>home</tag><tag>weekly list</tag>
        <task><title>Call shop</title><created>20240101T090000Z</created><updated>20240101T090000Z</updated><taskStatus>completed</taskStatus><inNote>true</inNote><taskFlag>false</taskFlag><sortWeight>B</sortWeight><noteLevelID>t1</noteLevelID><taskGroupNoteLevelID>group-1</taskGroupNoteLevelID></task>
        <task><title>Pay bill</title><created>20240101T090000Z</created><updated>20240101T090000Z</updated><taskStatus>open</taskStatus><inNote>true</inNote><taskFlag>false</taskFlag><sortWeight>A</sortWeight><noteLevelID>t2</noteLevelID><taskGroupNoteLevelID>group-1</taskGroupNoteLevelID></task>`),
      note('Code &amp; media', `<div style="box-sizing: border-box; --en-codeblock:true;"><div>const a = 1;</div><div>&lt;b&gt;</div></div>
        <en-media hash="abc" type="image/png"/><en-media hash="def" type="application/pdf"/><en-crypt hint="pw">AAAA</en-crypt><pre>x &lt; y</pre>`,
        '<created>20240103T000000Z</created>'),
    );
    const plan = await planEvernoteImport([enexFile('Home.enex', text, 13)], options);
    expect(plan.groups.map(group => group.name)).toEqual(['Home']);
    expect(plan.skipped).toEqual([]);
    const shopping = plan.notes.find(item => item.title === 'Shopping')!;
    expect(shopping.createdAt).toBe('2024-01-01T09:00:00.000Z');
    expect(shopping.updatedAt).toBe('2024-01-02T10:00:00.000Z');
    expect(shopping.content).toMatch(/data-checked="true".*Milk/);
    expect(shopping.content).toMatch(/data-checked="false".*Bread/);
    expect(shopping.content).toContain('<strong>bold</strong>');
    expect(shopping.content).toContain('<strong>styled</strong>');
    expect(shopping.content).toMatch(/data-checked="true".*Done item.*data-checked="false".*Open item/);
    // Tasks sit where their group marker was, in sort order.
    expect(shopping.content).toMatch(/data-checked="false"[^]*Pay bill[^]*data-checked="true"[^]*Call shop[^]*after tasks/);
    expect(shopping.content).toContain('<p>#home #weekly_list</p>');
    const code = plan.notes.find(item => item.title === 'Code & media')!;
    expect(code.content).toContain('<pre><code>const a = 1;\n&lt;b&gt;</code></pre>');
    expect(code.content).toContain('[Image]');
    expect(code.content).toContain('[File]');
    expect(code.content).toContain('[Encrypted]');
    expect(code.content).toContain('<pre><code>x &lt; y</code></pre>');
    expect(code.updatedAt).toBe('2024-01-03T00:00:00.000Z');
    expect(plan.embeds).toBe(3);
    // ToDo style: newest first.
    expect(plan.notes.map(item => item.title)).toEqual(['Code & media', 'Shopping']);
  });

  it('never expands entities from the file and removes scripts, handlers and unsafe links', async () => {
    const laughs = `<!DOCTYPE en-export [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;"><!ENTITY xxe SYSTEM "file:///etc/passwd">]>`;
    const text = `<?xml version="1.0"?>${laughs}<en-export>${note('Bomb &lol2;', '<div>x</div>')}${note('Ext &xxe;', '<div>y</div>')}
      ${note('Hostile', '<div onclick="alert(1)">Safe <script>alert(2)</script><a href="javascript:alert(3)">js</a> <a href="https://example.com">ok</a><img src="https://tracker.example/p.gif"/><iframe src="https://evil.example/"/></div><div>after</div>')}</en-export>`;
    const plan = await planEvernoteImport([enexFile('Hostile.enex', text)], options);
    expect(plan.notes.map(item => item.title)).toEqual(['Hostile']);
    expect(plan.skipped.map(item => item.reason)).toEqual(['invalid', 'invalid']);
    const [hostile] = plan.notes;
    expect(hostile.content).not.toMatch(/script|onclick|javascript:|<img|<iframe|tracker/);
    expect(hostile.content).toContain('<a href="https://example.com">ok</a>');
    // A self-closing iframe must not swallow the following text.
    expect(hostile.content).toContain('<p>after</p>');
  });

  it('skips huge attachments without keeping them and reports oversized notes', async () => {
    const attachment = `<resource><data encoding="base64">${'A'.repeat(20 * 1024 * 1024)}</data><mime>video/mp4</mime></resource>`;
    const huge = 'word '.repeat(500000);
    const text = enex(note('With video', '<en-media hash="1" type="video/mp4"/><div>kept</div>', attachment), note('Too long', `<div>${huge}</div>`));
    const plan = await planEvernoteImport([enexFile('Big.enex', text, 1 << 20)], options);
    expect(plan.notes.map(item => item.title)).toEqual(['With video']);
    expect(plan.notes[0].content).toContain('kept');
    expect(plan.skipped).toEqual([{ path: 'Big.enex: Too long', reason: 'tooLarge' }]);
  });

  it('reads .enex files inside a ZIP, one tray per file, and reports other files', async () => {
    const zip = await createZip([
      { path: 'Notebooks/Work.enex', data: enex(note('W', '<div>w</div>')), lastModified: fileTime },
      { path: 'Notebooks/Life.enex', data: enex(note('L', '<div>l</div>')), lastModified: fileTime },
      { path: 'Notebooks/readme.txt', data: 'x', lastModified: fileTime },
    ]);
    const plan = await planEvernoteImport([{ path: 'export.zip', size: zip.size, lastModified: fileTime, read: () => zip.text(), blob: zip }], options);
    expect(plan.groups.map(group => group.name)).toEqual(['Work', 'Life']);
    expect(plan.skipped).toEqual([{ path: 'export.zip/Notebooks/readme.txt', reason: 'unsupported' }]);
    const empty = await planEvernoteImport([enexFile('Empty.enex', 'not xml at all')], options);
    expect(empty.skipped).toEqual([{ path: 'Empty.enex', reason: 'invalid' }]);
  });
});
