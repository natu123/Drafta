import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { cloudWorkspace, WorkspaceConflictError } from './cloud-workspace';
import type { WorkspaceBackup } from './workspace-backup';
import { watchCloudWorkspace } from './cloud-workspace-watch';
import { IMPORT_BATCH_LIMITS } from './obsidian-import';

// The local emulator does not enforce this production query constraint.
vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return { ...actual, limit: (count: number) => {
    if (count > 10000) throw new Error('Production query limit exceeded');
    return actual.limit(count);
  } };
});

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host && host !== '127.0.0.1:8080') throw new Error('Local emulator required');
let env: RulesTestEnvironment;
const fresh = (): WorkspaceBackup => ({
  format: 'drafta-workspace', version: 1, exportedAt: '2026-09-28T00:00:00.000Z',
  groups: [{ id: 'tray', name: 'My tray', type: 'group', isPinned: true }],
  notes: [], settings: { language: 'ja', theme: 'dark', listStyle: 'top', noteSort: 'manual' },
});
const repository = (uid: string) => cloudWorkspace(env.authenticatedContext(uid).firestore() as unknown as Firestore, uid);

describe.skipIf(!host)('cloud workspace repository (emulator only)', () => {
  it('publishes coherent remote updates and preserves owner boundaries', async () => {
    const owner = repository('alice');
    const first = await owner.save(fresh(), null);
    const updates: number[] = [];
    const errors: unknown[] = [];
    const db = env.authenticatedContext('alice').firestore() as unknown as Firestore;
    const stop = watchCloudWorkspace(db, 'alice', result => updates.push(result.revision), error => errors.push(error));
    try {
      await vi.waitFor(() => expect(updates).toContain(1));
      const changed = fresh(); changed.groups[0].name = 'Remote tray';
      await owner.save(changed, first);
      await vi.waitFor(() => expect(updates).toContain(2));
      expect(errors).toEqual([]);
    } finally { stop(); }
    const denied: unknown[] = [];
    const stopOther = watchCloudWorkspace(env.authenticatedContext('bob').firestore() as unknown as Firestore, 'alice', () => { throw new Error('Cross-account update'); }, error => denied.push(error));
    try { await vi.waitFor(() => expect(denied.length).toBeGreaterThan(0)); } finally { stopOther(); }
  });
  it('skips parsing revisions the client already holds and publishes newer ones', async () => {
    const owner = repository('alice');
    const first = await owner.save(fresh(), null);
    const updates: number[] = [];
    const seen: number[] = [];
    const db = env.authenticatedContext('alice').firestore() as unknown as Firestore;
    const stop = watchCloudWorkspace(db, 'alice', result => updates.push(result.revision), error => { throw error; }, revision => { seen.push(revision); return revision <= 1; });
    try {
      await vi.waitFor(() => expect(seen).toContain(1));
      const changed = fresh(); changed.groups[0].name = 'Remote tray';
      await owner.save(changed, first);
      await vi.waitFor(() => expect(updates).toEqual([2]));
    } finally { stop(); }
  });
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-drafta-storage', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  });
  beforeEach(async () => { await env.clearFirestore(); });
  afterAll(async () => { await env?.cleanup(); });

  it('loads acknowledged settings and trays through a fresh client and preserves empty state', async () => {
    const owner = repository('alice');
    expect(await owner.load()).toBeNull();
    const saved = await owner.save(fresh(), null);
    expect(saved.revision).toBe(1);
    expect(await repository('alice').load()).toEqual(saved);
    const empty = fresh(); empty.groups = [];
    const next = await owner.save(empty, saved);
    expect(await repository('alice').load()).toEqual(next);
  });

  it('rejects stale writers without replacing the winning save', async () => {
    const owner = repository('alice');
    const base = await owner.save(fresh(), null);
    const changed = fresh(); changed.groups[0].name = 'Winner';
    const winner = await owner.save(changed, base);
    await expect(repository('alice').save(fresh(), base)).rejects.toBeInstanceOf(WorkspaceConflictError);
    await expect(owner.save(fresh(), null)).rejects.toBeInstanceOf(WorkspaceConflictError);
    expect(await owner.load()).toEqual(winner);
  });

  it('atomically preserves memo contents and ordering across edits and deletion', async () => {
    const input = fresh();
    input.notes = ['memo-b', 'memo-a'].map(id => ({
      id, group: 'tray', stars: 0, isPinned: true,
      createdAt: input.exportedAt, updatedAt: input.exportedAt,
      document: { format: 'drafta-document', schemaVersion: 1, document: { type: 'doc', content: [
        { type: 'title', content: [{ type: 'text', text: id }] },
        { type: 'paragraph', content: [{ type: 'text', text: '日本語の本文' }] },
      ] } },
    }));
    const owner = repository('alice');
    const base = await owner.save(input, null);
    expect(await repository('alice').load()).toEqual(base);
    input.notes.reverse();
    input.notes[0].isCompleted = true;
    const changed = await owner.save(input, base);
    expect(await repository('alice').load()).toEqual(changed);
    input.notes = [];
    const removed = await owner.save(input, changed);
    expect(await repository('alice').load()).toEqual(removed);
  });

  it('isolates accounts and rejects a baseline belonging to another account', async () => {
    const base = await repository('alice').save(fresh(), null);
    expect(await repository('bob').load()).toBeNull();
    await expect(repository('bob').save(fresh(), base)).rejects.toThrow('Account changed');
  });

  it('rejects corrupt server payloads instead of presenting an empty workspace', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/workspaces/default'), { schemaVersion: 1, revision: 1, metadataJson: '{', updatedAt: serverTimestamp() });
    });
    await expect(repository('alice').load()).rejects.toThrow();
  });

  it('saves a large import only in batches below the per-save change limit', async () => {
    const owner = repository('alice');
    const base = fresh();
    let saved = await owner.save(base, null);
    const imported = Array.from({ length: 801 }, (_, index) => ({
      id: `import-${index}`, group: 'tray', stars: 0 as const, createdAt: base.exportedAt, updatedAt: base.exportedAt,
      document: { format: 'drafta-document' as const, schemaVersion: 1 as const, document: { type: 'doc', content: [
        { type: 'title', content: [{ type: 'text', text: `Imported ${index}` }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Obsidian' }] },
      ] } },
    }));
    await expect(owner.save({ ...base, notes: imported }, saved)).rejects.toThrow('Too many changes in one save');
    for (let start = 0; start < imported.length; start += IMPORT_BATCH_LIMITS.notes) {
      saved = await owner.save({ ...base, notes: imported.slice(0, start + IMPORT_BATCH_LIMITS.notes) }, saved);
    }
    const loaded = await repository('alice').load();
    expect(loaded?.revision).toBe(4);
    expect(loaded?.backup.notes.map(note => note.id)).toEqual(imported.map(note => note.id));
  }, 120000);
});