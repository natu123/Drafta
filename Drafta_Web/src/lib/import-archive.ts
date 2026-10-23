import { IMPORT_RAW_FILE_BYTES, type ImportBudget, type ImportFile, type SkippedFile } from './obsidian-import';
import { listZip, readZipEntry, ZipError, zipEntryStream, type ZipEntry } from './zip';

/**
 * Turns selected ZIP files into the files inside them (specs/20). Only the central directory is
 * read here; each entry is inflated when a planner reads it, within the planner's limits. Every
 * archive of one import, nested ones too, draws on the same ImportBudget.
 */

// ENEX files are read in pieces and their attachments skipped, so they may be far larger than a page.
export const ENEX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

const reasonOf = (error: unknown): SkippedFile['reason'] => error instanceof ZipError ? error.reason : 'invalid';
const decoder = () => new TextDecoder('utf-8');

function entryFile(blob: Blob, entry: ZipEntry, archive: string, budget: ImportBudget): ImportFile {
  return {
    path: entry.path, archive, size: entry.size, lastModified: entry.lastModified,
    read: async () => decoder().decode(await readZipEntry(blob, entry, IMPORT_RAW_FILE_BYTES, budget)),
    stream: () => zipEntryStream(blob, entry, ENEX_FILE_BYTES, budget),
  };
}

async function expandZip(blob: Blob, archive: string, nested: boolean, result: ImportFile[], skipped: SkippedFile[], budget: ImportBudget, signal?: AbortSignal) {
  let entries: ZipEntry[];
  try { entries = await listZip(blob, budget); } catch (error) { skipped.push({ path: archive, reason: reasonOf(error) }); return; }
  for (const entry of entries) {
    signal?.throwIfAborted();
    const segments = entry.path.split('/');
    // Folders, macOS resource forks and hidden files are not content.
    if (entry.directory || segments[0] === '__MACOSX' || segments.some(segment => segment.startsWith('.'))) continue;
    if (nested && segments.length === 1 && /\.zip$/i.test(entry.path)) {
      // Once the budget is used up, the remaining parts are reported once instead of opened.
      if (budget.entries <= 0) { skipped.push({ path: `${archive}/${entry.path}`, reason: 'tooLarge' }); continue; }
      try {
        let inner: Blob;
        if (entry.method === 0 && !entry.encrypted) inner = await storedEntryBlob(blob, entry);
        else {
          // A compressed part is held in memory while the import is planned; all parts share one limit.
          if (entry.size > budget.nested) throw new ZipError('tooLarge', 'Nested archives too large');
          budget.nested -= entry.size;
          inner = new Blob([await readZipEntry(blob, entry, entry.size, budget) as BlobPart]);
        }
        await expandZip(inner, `${archive}/${entry.path}`, false, result, skipped, budget, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        skipped.push({ path: `${archive}/${entry.path}`, reason: reasonOf(error) });
      }
      continue;
    }
    result.push(entryFile(blob, entry, archive, budget));
  }
}

// A stored ZIP inside a ZIP is a plain slice of the outer file, so it is not copied into memory.
async function storedEntryBlob(blob: Blob, entry: ZipEntry): Promise<Blob> {
  const header = new DataView(await blob.slice(entry.headerOffset, entry.headerOffset + 30).arrayBuffer());
  if (header.byteLength < 30 || header.getUint32(0, true) !== 0x04034b50) throw new ZipError('invalid', 'Local header not found');
  const start = entry.headerOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  if (start + entry.size > blob.size || entry.size !== entry.compressedSize) throw new ZipError('invalid', 'Entry data out of range');
  return blob.slice(start, start + entry.size);
}

/** Replaces each selected `.zip` with its entries; other files pass through unchanged. */
export async function expandArchives(files: ImportFile[], skipped: SkippedFile[], budget: ImportBudget, signal?: AbortSignal): Promise<ImportFile[]> {
  const result: ImportFile[] = [];
  for (const file of files) {
    signal?.throwIfAborted();
    if (file.blob && /\.zip$/i.test(file.path)) await expandZip(file.blob, file.path, true, result, skipped, budget, signal);
    else result.push(file);
  }
  return result;
}
