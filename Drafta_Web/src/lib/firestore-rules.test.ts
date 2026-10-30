import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host && host !== '127.0.0.1:8080') throw new Error('Rules tests only support the local emulator at 127.0.0.1:8080');
const projectId = 'demo-drafta';
let env: RulesTestEnvironment;
const workspace = (revision = 1) => ({ schemaVersion: 1, revision, metadataJson: '{}', updatedAt: serverTimestamp() });
const note = () => ({ schemaVersion: 1, payloadJson: '{}', updatedAt: serverTimestamp() });
const summary = () => ({ schemaVersion: 2, summaryJson: '{}', updatedAt: serverTimestamp() });
const body = () => ({ schemaVersion: 2, documentJson: '{}', updatedAt: serverTimestamp() });
const TOKEN = 'abcdefghijklmnopqrstuv';
const share = (owner = 'alice', extra: Record<string, unknown> = {}) => ({ schemaVersion: 1, ownerUid: owner, noteId: 'memo-1', title: 'Shared', documentJson: '{}', updatedAt: serverTimestamp(), blocked: false, ...extra });

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
  it('accepts both storage versions while the migration runs (specs/17)', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const root = doc(db, 'users/alice/workspaces/default');
    await assertSucceeds(setDoc(root, workspace()));
    await assertSucceeds(setDoc(root, { ...workspace(2), schemaVersion: 2 }));
    await assertSucceeds(setDoc(root, { ...workspace(3), schemaVersion: 1 }));
    await assertFails(setDoc(root, { ...workspace(4), schemaVersion: 3 }));
    const memo = doc(db, 'users/alice/workspaces/default/notes/memo-1');
    await assertSucceeds(setDoc(memo, note()));
    // The migration adds the summary next to the 0.7 field, then the summary stands alone.
    await assertSucceeds(updateDoc(memo, { summaryJson: '{}', updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(memo, summary()));
    await assertFails(setDoc(memo, { ...summary(), payloadJson: '{}' }));
    await assertFails(setDoc(memo, { ...summary(), summaryJson: 42 }));
    await assertFails(setDoc(memo, { ...summary(), summaryJson: 'x'.repeat(500000) }));
    await assertFails(setDoc(memo, { ...summary(), schemaVersion: 1 }));
    await assertFails(setDoc(memo, { ...note(), summaryJson: 42 }));
    await assertFails(setDoc(memo, { ...summary(), updatedAt: 'fake' }));
  });
  it('keeps memo bodies to their owner and checks their envelope', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const ref = doc(db, 'users/alice/workspaces/default/bodies/memo-1');
    await assertSucceeds(setDoc(ref, body()));
    await assertSucceeds(getDoc(ref));
    for (const other of [env.unauthenticatedContext().firestore(), env.authenticatedContext('bob').firestore()]) {
      await assertFails(getDoc(doc(other, ref.path)));
      await assertFails(setDoc(doc(other, ref.path), body()));
      await assertFails(deleteDoc(doc(other, ref.path)));
    }
    await assertFails(setDoc(ref, { ...body(), schemaVersion: 1 }));
    await assertFails(setDoc(ref, { ...body(), documentJson: 42 }));
    await assertFails(setDoc(ref, { ...body(), extra: true }));
    await assertFails(setDoc(ref, { ...body(), documentJson: 'x'.repeat(500000) }));
    await assertFails(setDoc(ref, { ...body(), updatedAt: 'fake' }));
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/default/bodies/bad id'), body()));
    await assertFails(setDoc(doc(db, 'users/alice/workspaces/other/bodies/memo-1'), body()));
    await assertSucceeds(deleteDoc(ref));
  });
  it('lets the owner read the Pro state but nobody write it (specs/23)', async () => {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/billing/subscription'), { plan: 'pro', status: 'active' });
      await setDoc(doc(context.firestore(), 'billingCustomers/alice'), { customerId: 'cus_test' });
      await setDoc(doc(context.firestore(), 'stripeEvents/evt_test'), { type: 'test' });
    });
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'users/alice/billing/subscription')));
    await assertFails(setDoc(doc(alice, 'users/alice/billing/subscription'), { plan: 'pro', status: 'active' }));
    await assertFails(updateDoc(doc(alice, 'users/alice/billing/subscription'), { plan: 'free' }));
    await assertFails(deleteDoc(doc(alice, 'users/alice/billing/subscription')));
    await assertFails(setDoc(doc(alice, 'users/alice/billing/other'), { plan: 'pro' }));
    for (const path of ['billingCustomers/alice', 'stripeEvents/evt_test']) {
      await assertFails(getDoc(doc(alice, path)));
      await assertFails(setDoc(doc(alice, path), { x: 1 }));
    }
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('bob').firestore()]) {
      await assertFails(getDoc(doc(db, 'users/alice/billing/subscription')));
      await assertFails(setDoc(doc(db, 'users/alice/billing/subscription'), { plan: 'pro' }));
    }
  });
it('lets a Pro owner share a memo, anyone read it one at a time, and nobody else change it (specs/24)', async () => {
    const pro = async (uid: string, plan: 'pro' | 'free') => env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), `users/${uid}/billing/subscription`), { plan, status: plan === 'pro' ? 'active' : 'canceled' });
    });
    await pro('alice', 'pro'); await pro('bob', 'free');
    const alice = env.authenticatedContext('alice').firestore();
    const create = writeBatch(alice);
    create.set(doc(alice, `shares/${TOKEN}`), share());
    create.set(doc(alice, 'users/alice/workspaces/default/shareLinks/memo-1'), { token: TOKEN, createdAt: serverTimestamp() });
    await assertSucceeds(create.commit());
    await assertSucceeds(getDoc(doc(alice, 'users/alice/workspaces/default/shareLinks/memo-1')));
    await assertSucceeds(setDoc(doc(alice, `shares/${TOKEN}`), share('alice', { title: 'Edited' })));
    // The owner cannot move the copy to another memo, add fields, or use a short token.
    await assertFails(setDoc(doc(alice, `shares/${TOKEN}`), share('alice', { noteId: 'memo-2' })));
    await assertFails(setDoc(doc(alice, `shares/${TOKEN}`), share('alice', { views: 1 })));
    await assertFails(setDoc(doc(alice, 'shares/short'), share()));
    // A link entry must point at the owner's own copy of that memo.
    await assertFails(setDoc(doc(alice, 'users/alice/workspaces/default/shareLinks/memo-2'), { token: TOKEN, createdAt: serverTimestamp() }));

    const anonymous = env.unauthenticatedContext().firestore();
    const bob = env.authenticatedContext('bob').firestore();
    for (const db of [anonymous, bob]) {
      await assertSucceeds(getDoc(doc(db, `shares/${TOKEN}`)));
      await assertFails(getDocs(collection(db, 'shares')));
      await assertFails(setDoc(doc(db, `shares/${TOKEN}`), share('bob')));
      await assertFails(deleteDoc(doc(db, `shares/${TOKEN}`)));
      await assertFails(getDoc(doc(db, 'users/alice/workspaces/default/shareLinks/memo-1')));
    }
    // A free account cannot share, even its own memo.
    await assertFails(setDoc(doc(bob, 'shares/bbbbbbbbbbbbbbbbbbbbbb'), share('bob')));

    // Back to free: the page is not readable and not updatable; Pro again brings the same link back.
    await pro('alice', 'free');
    await assertFails(getDoc(doc(anonymous, `shares/${TOKEN}`)));
    await assertFails(setDoc(doc(alice, `shares/${TOKEN}`), share('alice', { title: 'Later' })));
    await pro('alice', 'pro');
    await assertSucceeds(getDoc(doc(anonymous, `shares/${TOKEN}`)));

    // Blocked by the operator: nobody reads it and the owner cannot clear it, but can delete it.
    await env.withSecurityRulesDisabled(async context => { await updateDoc(doc(context.firestore(), `shares/${TOKEN}`), { blocked: true }); });
    await assertFails(getDoc(doc(anonymous, `shares/${TOKEN}`)));
    await assertFails(setDoc(doc(alice, `shares/${TOKEN}`), share()));
    await assertSucceeds(deleteDoc(doc(alice, `shares/${TOKEN}`)));
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/workspaces/default/shareLinks/memo-1')));
  });
it('lets a Pro owner set a reminder, anyone stop their own, and nobody else see it (specs/25)', async () => {
    const plan = async (value: 'pro' | 'free') => env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users/alice/billing/subscription'), { plan: value, status: value === 'pro' ? 'active' : 'canceled' });
    });
    const reminder = (extra: Record<string, unknown> = {}) => ({ ownerUid: 'alice', noteId: 'memo-1', title: 'Send the invoice', wallTime: '2026-10-30T18:00',
      timeZone: 'Asia/Tokyo', repeat: 'daily', nextAt: Timestamp.fromMillis(Date.parse('2026-10-30T09:00Z')), lang: 'ja', updatedAt: serverTimestamp(), ...extra });
    const alice = env.authenticatedContext('alice').firestore();
    const ref = doc(alice, 'reminders/alice_memo-1');
    await plan('free');
    await assertFails(setDoc(ref, reminder()));
    await plan('pro');
    await assertSucceeds(setDoc(ref, reminder()));
    await assertSucceeds(getDoc(ref));
    // The id, fields and values are checked.
    await assertFails(setDoc(doc(alice, 'reminders/alice_memo-2'), reminder()));
    await assertFails(setDoc(doc(alice, 'reminders/bob_memo-1'), reminder({ ownerUid: 'bob' })));
    await assertFails(setDoc(ref, reminder({ repeat: 'hourly' })));
    await assertFails(setDoc(ref, reminder({ wallTime: 'tomorrow' })));
    await assertFails(setDoc(ref, reminder({ sent: true })));
    // Back to free: no new time, but stopping and deleting still work.
    await plan('free');
    await assertFails(setDoc(ref, reminder({ wallTime: '2026-11-01T09:00' })));
    await assertSucceeds(setDoc(ref, reminder({ nextAt: null })));
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('bob').firestore()]) {
      await assertFails(getDoc(doc(db, 'reminders/alice_memo-1')));
      await assertFails(getDocs(collection(db, 'reminders')));
      await assertFails(setDoc(doc(db, 'reminders/alice_memo-1'), reminder({ nextAt: null })));
      await assertFails(deleteDoc(doc(db, 'reminders/alice_memo-1')));
    }
    await assertSucceeds(deleteDoc(ref));
  });

  it('keeps push subscriptions to their owner (specs/25)', async () => {
    const subscription = (extra: Record<string, unknown> = {}) => ({ endpoint: 'https://push.example.test/abc', p256dh: 'key', auth: 'secret', createdAt: serverTimestamp(), ...extra });
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice/pushSubscriptions/device-1'), subscription()));
    await assertSucceeds(getDoc(doc(alice, 'users/alice/pushSubscriptions/device-1')));
    await assertFails(setDoc(doc(alice, 'users/alice/pushSubscriptions/device-2'), subscription({ endpoint: 'http://push.example.test/abc' })));
    await assertFails(setDoc(doc(alice, 'users/alice/pushSubscriptions/device-2'), subscription({ extra: 1 })));
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('bob').firestore()]) {
      await assertFails(getDoc(doc(db, 'users/alice/pushSubscriptions/device-1')));
      await assertFails(setDoc(doc(db, 'users/alice/pushSubscriptions/device-3'), subscription()));
    }
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/pushSubscriptions/device-1')));
  });
});
