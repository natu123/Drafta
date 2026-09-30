import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDocsFromServer, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import { cloudWorkspace, WorkspaceConflictError } from './cloud-workspace';
import { HISTORY_LIMITS, historyCandidate, memoHistory, validateHistoryNote } from './memo-history';
import type { BackupNote, WorkspaceBackup } from './workspace-backup';

const time = '2026-09-30T00:00:00.000Z';
const note = (text = 'Original'): BackupNote => ({ id: 'memo', group: 'tray', stars: 0, createdAt: time, updatedAt: time,
  document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [
    { type: 'title', content: [{ type: 'text', text: 'History memo' }] },
    { type: 'paragraph', content: text ? [{ type: 'text', text }] : undefined },
  ] } },
});
const workspace = (text = 'Original'): WorkspaceBackup => ({ format: 'drafta-workspace', version: 1, exportedAt: time,
  groups: [{ id: 'tray', name: 'Tray' }], notes: [note(text)], settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' },
});

describe('memo history policy and validation', () => {
  it('captures initial and changed documents, but ignores metadata-only edits', () => {
    expect(historyCandidate(note())?.note).toEqual(note());
    expect(historyCandidate({ ...note(), isPinned: true }, note())).toBeNull();
    expect(historyCandidate(note('Edited'), note())).toMatchObject({ force: false });
    expect(historyCandidate({ ...note(), type: 'separator' })).toBeNull();
  });
  it('prioritizes the version before body clearing or soft deletion', () => {
    expect(historyCandidate(note(''), note())).toMatchObject({ force: true, note: note() });
    expect(historyCandidate({ ...note(), isDeleted: true }, note())).toMatchObject({ force: true });
  });
  it('validates document content and reference IDs before rendering history', () => {
    expect(validateHistoryNote({ ...note(), parentId: 'previous-parent' })).toMatchObject({ parentId: 'previous-parent' });
    expect(() => validateHistoryNote({ ...note(), parentId: 'bad/id' })).toThrow();
    expect(() => validateHistoryNote({ ...note(), plan: 'pro' })).toThrow();
    const unsafe = note(); unsafe.document.document.content![1].content![0].marks = [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }];
    expect(() => validateHistoryNote(unsafe)).toThrow();
  });
});

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host && host !== '127.0.0.1:8080') throw new Error('Local history emulator required');
let env: RulesTestEnvironment;
const dbFor = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;
describe.skipIf(!host)('bounded memo history (emulator only)', () => {
  beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-drafta-history', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } }); });
  beforeEach(async () => { await env.clearFirestore(); });
  afterAll(async () => { await env?.cleanup(); });
  it('throttles normal edits and preserves the last body before clearing', async () => {
    const repository = cloudWorkspace(dbFor('alice'), 'alice');
    let saved = await repository.save(workspace(), null);
    saved = await repository.save(workspace('First edit'), saved);
    saved = await repository.save(workspace('Final edit'), saved);
    expect(await repository.history.list('memo')).toHaveLength(1);
    await repository.save(workspace(''), saved);
    const versions = await repository.history.list('memo');
    expect(versions).toHaveLength(2);
    expect(versions[0].note.document).toEqual(note('Final edit').document);
    expect(versions[1].note.document).toEqual(note().document);
  });
  it('keeps only 20 immutable versions and deduplicates concurrent writers', async () => {
    const db = dbFor('alice'), repository = cloudWorkspace(db, 'alice');
    await repository.save(workspace(), null);
    for (let index = 0; index < 22; index++) await repository.history.record(note(`Version ${index}`), true);
    await Promise.all([repository.history.record(note('Concurrent version'), true), memoHistory(dbFor('alice'), 'alice').record(note('Concurrent version'), true)]);
    const versions = await repository.history.list('memo');
    expect(versions).toHaveLength(HISTORY_LIMITS.versions);
    expect(versions.filter(version => version.note.document.document.content![1].content![0].text === 'Concurrent version')).toHaveLength(1);
    const documents = await getDocsFromServer(collection(db, 'users/alice/workspaces/default/memoHistory/memo/versions'));
    expect(documents.size).toBe(20);
  });
  it('records after the interval using server timestamps, independent of the client clock', async () => {
    const db = dbFor('alice'), repository = cloudWorkspace(db, 'alice');
    await repository.save(workspace(), null);
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/workspaces/default/memoHistory/memo'), { capturedAt: Timestamp.fromMillis(Date.now() - HISTORY_LIMITS.intervalMs - 1000) }, { merge: true });
    });
    await memoHistory(dbFor('alice'), 'alice').record(note('After interval'));
    expect(await repository.history.list('memo')).toHaveLength(2);
  });
  it('accepts production timestamp precision beyond whole milliseconds', async () => {
    const repository = cloudWorkspace(dbFor('alice'), 'alice');
    await repository.save(workspace(), null);
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/workspaces/default/notes/memo'), { updatedAt: new Timestamp(Math.floor(Date.now() / 1000), 123456000) }, { merge: true });
    });
    await memoHistory(dbFor('alice'), 'alice').record(note('Precise server clock'), true);
    expect(await repository.history.list('memo')).toHaveLength(2);
  });
  it('keeps primary save acknowledgement when history storage fails', async () => {
    const warned = vi.fn(), repository = cloudWorkspace(dbFor('alice'), 'alice', { onHistoryFailure: warned });
    vi.spyOn(repository.history, 'record').mockRejectedValueOnce(new Error('History unavailable'));
    const saved = await repository.save(workspace(), null);
    expect(saved.revision).toBe(1);
    expect(await repository.load()).toEqual(saved);
    expect(warned).toHaveBeenCalledTimes(1);
  });
  it('does not archive rejected stale saves and removes history on permanent deletion', async () => {
    const repository = cloudWorkspace(dbFor('alice'), 'alice');
    const base = await repository.save(workspace(), null);
    const saved = await repository.save(workspace('Winner'), base);
    await expect(repository.save(workspace('Stale edit'), base)).rejects.toBeInstanceOf(WorkspaceConflictError);
    expect(await repository.history.list('memo')).toHaveLength(1);
    await repository.save({ ...workspace(), notes: [] }, saved);
    expect(await repository.history.list('memo')).toEqual([]);
    expect((await getDocsFromServer(collection(dbFor('alice'), 'users/alice/workspaces/default/memoHistory/memo/versions'))).size).toBe(0);
  });
  it('denies anonymous and other-account access to history', async () => {
    await cloudWorkspace(dbFor('alice'), 'alice').save(workspace(), null);
    await expect(memoHistory(dbFor('bob'), 'alice').list('memo')).rejects.toThrow();
    await expect(memoHistory(env.unauthenticatedContext().firestore() as unknown as Firestore, 'alice').list('memo')).rejects.toThrow();
    await expect(memoHistory(dbFor('bob'), 'alice').record(note('Unauthorized'), true)).rejects.toThrow();
  });
});
