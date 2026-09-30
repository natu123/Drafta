import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host && host !== '127.0.0.1:8080') throw new Error('Rules tests only support the local emulator at 127.0.0.1:8080');
const projectId = 'demo-drafta';
let env: RulesTestEnvironment;
const workspace = (revision = 1) => ({ schemaVersion: 1, revision, metadataJson: '{}', updatedAt: serverTimestamp() });
const note = () => ({ schemaVersion: 1, payloadJson: '{}', updatedAt: serverTimestamp() });

describe.skipIf(!host)('Firestore owner isolation (emulator only)', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  });
  beforeEach(async () => { await env.clearFirestore(); });
  afterAll(async () => { await env?.cleanup(); });

  it('allows the owner to create, read and revise a workspace', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const ref = doc(db, 'users/alice/workspaces/default');
    await assertSucceeds(setDoc(ref, workspace()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(setDoc(ref, workspace(2)));
    await assertFails(setDoc(ref, workspace(2)));
    await assertFails(deleteDoc(ref));
  });

  it('denies anonymous and cross-account reads and writes', async () => {
    const owner = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(owner, 'users/alice/workspaces/default'), workspace()));
    await assertSucceeds(setDoc(doc(owner, 'users/alice/workspaces/default/notes/memo-1'), note()));
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('bob').firestore()]) {
      for (const path of ['users/alice/workspaces/default', 'users/alice/workspaces/default/notes/memo-1']) {
        await assertFails(getDoc(doc(db, path)));
        await assertFails(setDoc(doc(db, path), path.endsWith('memo-1') ? note() : workspace(2)));
        await assertFails(deleteDoc(doc(db, path)));
      }
    }
  });

  it('denies plan changes, unknown fields and unimplemented profiles', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice'), { plan: 'pro', storageLimit: 999999 }));
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/other'), workspace()));
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/default'), { ...workspace(), plan: 'pro' }));
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/default'), { ...workspace(), revision: 99 }));
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/default'), { ...workspace(), updatedAt: 'fake' }));
  });

  it('validates document envelopes and permits owner note deletion', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const ref = doc(db, 'users/alice/workspaces/default/notes/memo-1');
    await assertSucceeds(setDoc(ref, note()));
    await assertSucceeds(getDoc(ref));
    await assertFails(setDoc(ref, { ...note(), schemaVersion: 2 }));
    await assertFails(setDoc(ref, { ...note(), payloadJson: 42 }));
    await assertFails(setDoc(ref, { ...note(), extra: true }));
    await assertFails(setDoc(ref, { ...note(), payloadJson: 'x'.repeat(500000) }));
    await assertSucceeds(deleteDoc(ref));
  });
  it('keeps history versions immutable and denies recording for missing memos', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const historyRef = doc(db, 'users/alice/workspaces/default/memoHistory/memo-1/versions/version-1');
    const version = { schemaVersion: 1, payloadJson: '{}', capturedAt: serverTimestamp() };
    await assertFails(setDoc(historyRef, version));
    await assertSucceeds(setDoc(doc(db, 'users/alice/workspaces/default/notes/memo-1'), note()));
    await assertSucceeds(setDoc(historyRef, version));
    await assertFails(setDoc(historyRef, version));
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), historyRef.path)));
    await assertSucceeds(deleteDoc(historyRef));
  });
  it('enforces the history index cap and server timestamps', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice/workspaces/default/notes/memo-1'), note()));
    const ref = doc(db, 'users/alice/workspaces/default/memoHistory/memo-1');
    const head = { schemaVersion: 1, versionIds: Array.from({ length: 20 }, (_, index) => `v-${index}`), contentHash: 'a'.repeat(64), capturedAt: serverTimestamp() };
    await assertSucceeds(setDoc(ref, head));
    await assertFails(setDoc(ref, { ...head, versionIds: [...head.versionIds, 'v-20'] }));
    await assertFails(setDoc(ref, { ...head, capturedAt: 'fake' }));
    await assertFails(setDoc(ref, { ...head, public: true }));
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/other/memoHistory/memo-1'), head));
  });
});
