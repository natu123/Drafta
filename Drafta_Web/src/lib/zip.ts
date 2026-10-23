/**
 * Minimal ZIP reading and writing for imports and exports (specs/20). Reading works on a Blob, so a
 * large export is never loaded whole: only the central directory and the chosen entries are read.
 * Every size in an archive is untrusted; inflation stops at the caller's limit (zip bombs).
 * Compression uses the browser's own DecompressionStream / CompressionStream (deflate-raw).
 */

export const ZIP_LIMITS = { entries: 50000, directoryBytes: 16 * 1024 * 1024 } as const;

export type ZipFailure = 'invalid' | 'tooLarge' | 'unsupported';
export class ZipError extends Error {
  constructor(public readonly reason: ZipFailure, message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

export type ZipEntry = {
  /** '/'-separated, without empty, '.' or '..' segments. */
  path: string;
  directory: boolean;
  size: number;
  compressedSize: number;
  method: number;
  encrypted: boolean;
  crc: number;
  lastModified: number;
  headerOffset: number;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array, previous = 0): number {
  let crc = ~previous >>> 0;
  for (let index = 0; index < data.length; index++) crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  return ~crc >>> 0;
}

const utf8 = new TextEncoder();
const fail = (reason: ZipFailure, message: string): never => { throw new ZipError(reason, message); };
const bytesOf = async (blob: Blob, start: number, end: number) => new Uint8Array(await blob.slice(start, end).arrayBuffer());
const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

// Archives made without the UTF-8 flag (Windows Explorer, older tools) use a local code page.
function decodeName(bytes: Uint8Array, flagged: boolean): string {
  if (flagged) return new TextDecoder('utf-8').decode(bytes);
  for (const label of ['utf-8', 'shift_jis']) {
    try { return new TextDecoder(label, { fatal: true }).decode(bytes); } catch { /* next */ }
  }
  return new TextDecoder('windows-1252').decode(bytes);
}

function normalizePath(name: string): string | null {
  const segments = name.replace(/\\/g, '/').split('/').filter(segment => segment && segment !== '.');
  if (!segments.length || segments.includes('..') || /^[A-Za-z]:$/.test(segments[0])) return null;
  return segments.join('/');
}

function dosTime(time: number, date: number): number {
  const value = new Date(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2).getTime();
  return Number.isFinite(value) ? value : 0;
}

/** Reads the central directory. Entries with unsafe paths are left out. */
export async function listZip(blob: Blob): Promise<ZipEntry[]> {
  if (blob.size < 22) fail('invalid', 'Not a ZIP archive');
  const tailStart = Math.max(0, blob.size - 22 - 65535);
  const tail = await bytesOf(blob, tailStart, blob.size);
  const tailView = view(tail);
  let end = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (tailView.getUint32(index, true) === 0x06054b50 && index + 22 + tailView.getUint16(index + 20, true) <= tail.length) { end = index; break; }
  }
  if (end < 0) fail('invalid', 'End of central directory not found');
  let count = tailView.getUint16(end + 10, true);
  let directorySize = tailView.getUint32(end + 12, true);
  let directoryOffset = tailView.getUint32(end + 16, true);
  if (tailView.getUint16(end + 4, true) !== 0 && tailView.getUint16(end + 4, true) !== 0xffff) fail('unsupported', 'Split archives are not supported');
  if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    const locator = end - 20;
    if (locator < 0 || tailView.getUint32(locator, true) !== 0x07064b50) fail('invalid', 'ZIP64 locator not found');
    const recordOffset = Number(tailView.getBigUint64(locator + 8, true));
    if (recordOffset + 56 > blob.size) fail('invalid', 'ZIP64 record out of range');
    const record = view(await bytesOf(blob, recordOffset, recordOffset + 56));
    if (record.getUint32(0, true) !== 0x06064b50) fail('invalid', 'ZIP64 record not found');
    count = Number(record.getBigUint64(32, true));
    directorySize = Number(record.getBigUint64(40, true));
    directoryOffset = Number(record.getBigUint64(48, true));
  }
  if (count > ZIP_LIMITS.entries) fail('tooLarge', 'Too many entries');
  if (directorySize > ZIP_LIMITS.directoryBytes) fail('tooLarge', 'Central directory too large');
  if (directoryOffset + directorySize > blob.size) fail('invalid', 'Central directory out of range');
  const directory = await bytesOf(blob, directoryOffset, directoryOffset + directorySize);
  const data = view(directory);
  const entries: ZipEntry[] = [];
  let at = 0;
  for (let index = 0; index < count; index++) {
    if (at + 46 > directory.length || data.getUint32(at, true) !== 0x02014b50) fail('invalid', 'Broken central directory');
    const flags = data.getUint16(at + 8, true);
    const nameLength = data.getUint16(at + 28, true);
    const extraLength = data.getUint16(at + 30, true);
    const commentLength = data.getUint16(at + 32, true);
    const next = at + 46 + nameLength + extraLength + commentLength;
    if (next > directory.length) fail('invalid', 'Broken central directory');
    const nameBytes = directory.subarray(at + 46, at + 46 + nameLength);
    let name = decodeName(nameBytes, (flags & 0x800) !== 0);
    let size = data.getUint32(at + 24, true);
    let compressedSize = data.getUint32(at + 20, true);
    let headerOffset = data.getUint32(at + 42, true);
    let lastModified = dosTime(data.getUint16(at + 12, true), data.getUint16(at + 14, true));
    const extra = view(directory.subarray(at + 46 + nameLength, at + 46 + nameLength + extraLength));
    for (let field = 0; field + 4 <= extra.byteLength;) {
      const id = extra.getUint16(field, true);
      const length = extra.getUint16(field + 2, true);
      const body = field + 4;
      if (body + length > extra.byteLength) break;
      if (id === 0x0001) {
        // ZIP64 sizes appear only for the fields saturated in the fixed header, in this order.
        let cursor = body;
        const take = () => { if (cursor + 8 > body + length) fail('invalid', 'Broken ZIP64 field'); const value = Number(extra.getBigUint64(cursor, true)); cursor += 8; return value; };
        if (size === 0xffffffff) size = take();
        if (compressedSize === 0xffffffff) compressedSize = take();
        if (headerOffset === 0xffffffff) headerOffset = take();
      } else if (id === 0x5455 && length >= 5 && extra.getUint8(body) & 1) {
        lastModified = extra.getUint32(body + 1, true) * 1000;
      } else if (id === 0x7075 && length > 5 && extra.getUint8(body) === 1 && extra.getUint32(body + 1, true) === crc32(nameBytes)) {
        name = new TextDecoder('utf-8').decode(new Uint8Array(extra.buffer, extra.byteOffset + body + 5, length - 5));
      }
      field = body + length;
    }
    const method = data.getUint16(at + 10, true);
    const crc = data.getUint32(at + 16, true);
    at = next;
    const path = normalizePath(name);
    if (!path) continue;
    entries.push({ path, directory: name.endsWith('/') || name.endsWith('\\'), size, compressedSize, method, encrypted: (flags & 1) !== 0, crc, lastModified, headerOffset });
  }
  return entries;
}

async function dataRange(blob: Blob, entry: ZipEntry): Promise<{ start: number; end: number }> {
  if (entry.encrypted) fail('unsupported', 'Encrypted entry');
  if (entry.method !== 0 && entry.method !== 8) fail('unsupported', 'Unsupported compression method');
  if (entry.headerOffset + 30 > blob.size) fail('invalid', 'Local header out of range');
  const header = view(await bytesOf(blob, entry.headerOffset, entry.headerOffset + 30));
  if (header.getUint32(0, true) !== 0x04034b50) fail('invalid', 'Local header not found');
  const start = entry.headerOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  const end = start + entry.compressedSize;
  if (end > blob.size) fail('invalid', 'Entry data out of range');
  return { start, end };
}

/** Blob.stream, with a whole-read fallback where it is missing (jsdom in tests). */
export const blobStream = (blob: Blob): ReadableStream<Uint8Array> => typeof blob.stream === 'function'
  ? blob.stream() as ReadableStream<Uint8Array>
  : new ReadableStream({ async start(controller) { controller.enqueue(new Uint8Array(await blob.arrayBuffer())); controller.close(); } });

/**
 * The entry's bytes as a stream that errors once more than `maxBytes` (or more than the declared
 * size) would come out, and at the end when the size or CRC-32 does not match the directory.
 */
export function zipEntryStream(blob: Blob, entry: ZipEntry, maxBytes: number): ReadableStream<Uint8Array> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let total = 0;
  let crc = 0;
  return new ReadableStream<Uint8Array>({
    async start() {
      if (entry.size > maxBytes) fail('tooLarge', 'Entry too large');
      const { start, end } = await dataRange(blob, entry);
      const raw = blobStream(blob.slice(start, end));
      reader = (entry.method === 8 ? raw.pipeThrough(new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>) : raw).getReader();
    },
    async pull(controller) {
      try {
        const { done, value } = await reader!.read();
        if (done) {
          if (total !== entry.size || crc !== entry.crc) fail('invalid', 'Entry size or checksum mismatch');
          controller.close();
          return;
        }
        total += value.byteLength;
        if (total > entry.size) fail('invalid', 'Entry larger than declared');
        crc = crc32(value, crc);
        controller.enqueue(value);
      } catch (error) {
        void reader?.cancel().catch(() => undefined);
        throw error instanceof ZipError ? error : new ZipError('invalid', 'Could not inflate entry');
      }
    },
    cancel() { return reader?.cancel(); },
  });
}

/** Reads a whole entry into memory, at most `maxBytes`. */
export async function readZipEntry(blob: Blob, entry: ZipEntry, maxBytes: number): Promise<Uint8Array> {
  const reader = zipEntryStream(blob, entry, maxBytes).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(data); controller.close(); } })
    .pipeThrough(new CompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export type ZipInput = { path: string; data: Uint8Array | string; lastModified: number };

/** Writes a ZIP with UTF-8 names and modification times (local DOS time plus the UTC extra field). */
export async function createZip(files: ZipInput[]): Promise<Blob> {
  if (files.length >= 0xffff) fail('tooLarge', 'Too many files for a ZIP without ZIP64');
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = utf8.encode(file.path);
    const data = typeof file.data === 'string' ? utf8.encode(file.data) : file.data;
    const crc = crc32(data);
    const deflated = await deflateRaw(data);
    const stored = deflated.byteLength >= data.byteLength;
    const body = stored ? data : deflated;
    const time = new Date(Math.max(file.lastModified, Date.UTC(1980, 0, 2)));
    const dos = { time: (time.getHours() << 11) | (time.getMinutes() << 5) | (time.getSeconds() >> 1), date: ((time.getFullYear() - 1980) << 9) | ((time.getMonth() + 1) << 5) | time.getDate() };
    const fields = (header: DataView, at: number) => {
      header.setUint16(at, 20, true);
      header.setUint16(at + 2, 0x800, true);
      header.setUint16(at + 4, stored ? 0 : 8, true);
      header.setUint16(at + 6, dos.time, true);
      header.setUint16(at + 8, dos.date, true);
      header.setUint32(at + 10, crc, true);
      header.setUint32(at + 14, body.byteLength, true);
      header.setUint32(at + 18, data.byteLength, true);
      header.setUint16(at + 22, name.byteLength, true);
      header.setUint16(at + 24, 9, true);
    };
    const extra = new Uint8Array(9);
    const extraView = view(extra);
    extraView.setUint16(0, 0x5455, true);
    extraView.setUint16(2, 5, true);
    extraView.setUint8(4, 1);
    extraView.setUint32(5, Math.floor(Math.max(0, file.lastModified) / 1000), true);
    const local = new Uint8Array(30);
    view(local).setUint32(0, 0x04034b50, true);
    fields(view(local), 4);
    const entry = new Uint8Array(46);
    const entryView = view(entry);
    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(4, (3 << 8) | 20, true);
    fields(entryView, 6);
    entryView.setUint32(38, (0o100644 << 16) >>> 0, true);
    entryView.setUint32(42, offset, true);
    parts.push(local, name, extra, body);
    central.push(entry, name, extra);
    offset += 30 + name.byteLength + 9 + body.byteLength;
    if (offset >= 0xffffffff) fail('tooLarge', 'Archive too large for a ZIP without ZIP64');
  }
  const directorySize = central.reduce((sum, part) => sum + part.byteLength, 0);
  const end = new Uint8Array(22);
  const endView = view(end);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end] as BlobPart[], { type: 'application/zip' });
}
