/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { createZip, crc32, listZip, readZipEntry, ZipError, ZIP_LIMITS } from './zip';

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
const time = Date.UTC(2026, 9, 23, 3, 4, 6);

/** Offsets of the first central directory entry and the end record of a ZIP written by createZip. */
function layout(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  return { view, end, directory: view.getUint32(end + 16, true) };
}

async function failure(promise: Promise<unknown>) {
  try { await promise; } catch (error) { return error instanceof ZipError ? error.reason : 'other'; }
  return 'none';
}

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('round-trips UTF-8 names, text and modification times, stored or deflated', async () => {
    const zip = await createZip([
      { path: 'Drafta/メモ/日本語.md', data: '本文'.repeat(500), lastModified: time },
      { path: 'Drafta/tiny.md', data: 'x', lastModified: time },
    ]);
    const entries = await listZip(zip);
    expect(entries.map(entry => entry.path)).toEqual(['Drafta/メモ/日本語.md', 'Drafta/tiny.md']);
    expect(entries[0].method).toBe(8);
    expect(entries[1].method).toBe(0);
    expect(entries[0].lastModified).toBe(time);
    expect(text(await readZipEntry(zip, entries[0], 1 << 20))).toBe('本文'.repeat(500));
    expect(text(await readZipEntry(zip, entries[1], 1 << 20))).toBe('x');
  });

  it('refuses entries over the limit before inflating them', async () => {
    const zip = await createZip([{ path: 'big.md', data: 'a'.repeat(5000), lastModified: time }]);
    const [entry] = await listZip(zip);
    expect(await failure(readZipEntry(zip, entry, 4999))).toBe('tooLarge');
  });

  it('stops inflating when the data is larger than declared (zip bomb with a lying size)', async () => {
    const bytes = await bytesOf(await createZip([{ path: 'bomb.md', data: new Uint8Array(3 * 1024 * 1024), lastModified: time }]));
    const { view, directory } = layout(bytes);
    view.setUint32(directory + 24, 1000, true);
    const blob = new Blob([bytes]);
    const [entry] = await listZip(blob);
    expect(entry.size).toBe(1000);
    expect(await failure(readZipEntry(blob, entry, 2 * 1024 * 1024))).toBe('invalid');
  });

  it('rejects a checksum mismatch', async () => {
    const bytes = await bytesOf(await createZip([{ path: 'a.md', data: 'hello', lastModified: time }]));
    const { view, directory } = layout(bytes);
    view.setUint32(directory + 16, 0x12345678, true);
    const blob = new Blob([bytes]);
    const [entry] = await listZip(blob);
    expect(await failure(readZipEntry(blob, entry, 100))).toBe('invalid');
  });

  it('leaves out entries that climb out of the archive and normalizes separators', async () => {
    const zip = await createZip([
      { path: '../evil.md', data: 'x', lastModified: time },
      { path: 'C:/windows.md', data: 'x', lastModified: time },
      { path: 'a\\b\\./c.md', data: 'x', lastModified: time },
      { path: '/rooted.md', data: 'x', lastModified: time },
    ]);
    expect((await listZip(zip)).map(entry => entry.path)).toEqual(['a/b/c.md', 'rooted.md']);
  });

  it('rejects files that are not ZIP archives and directories over the entry limit', async () => {
    expect(await failure(listZip(new Blob(['not a zip at all, just text'])))).toBe('invalid');
    const bytes = await bytesOf(await createZip([{ path: 'a.md', data: 'x', lastModified: time }]));
    const { view, end } = layout(bytes);
    view.setUint16(end + 10, 0xfffe, true);
    view.setUint16(end + 8, 0xfffe, true);
    expect(ZIP_LIMITS.entries).toBeLessThan(0xfffe);
    expect(await failure(listZip(new Blob([bytes])))).toBe('tooLarge');
  });

  it('rejects encrypted entries and unknown compression methods', async () => {
    const bytes = await bytesOf(await createZip([{ path: 'a.md', data: 'secret', lastModified: time }]));
    const { view, directory } = layout(bytes);
    view.setUint16(directory + 8, view.getUint16(directory + 8, true) | 1, true);
    let blob = new Blob([bytes]);
    expect(await failure(readZipEntry(blob, (await listZip(blob))[0], 100))).toBe('unsupported');
    view.setUint16(directory + 8, view.getUint16(directory + 8, true) & ~1, true);
    view.setUint16(directory + 10, 14, true);
    blob = new Blob([bytes]);
    expect(await failure(readZipEntry(blob, (await listZip(blob))[0], 100))).toBe('unsupported');
  });

  it('rejects data offsets outside the file', async () => {
    const bytes = await bytesOf(await createZip([{ path: 'a.md', data: 'x', lastModified: time }]));
    const { view, directory } = layout(bytes);
    view.setUint32(directory + 42, bytes.length + 10, true);
    expect(await failure(listZip(new Blob([bytes])))).toBe('invalid');
  });
});
