import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { sendDueReminders, type Delivery, type PushTarget, type ReminderPayload } from './reminders.js';

// Only on the local emulator: `npm run test:functions` in Drafta_Web.
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (host && host !== '127.0.0.1:8080') throw new Error('Reminder tests only support the local emulator at 127.0.0.1:8080');
const db = host ? getFirestore(initializeApp({ projectId: 'demo-drafta' }, 'reminder-tests')) : null!;

const NOW = Date.parse('2026-10-30T09:00:30Z'); // 18:00:30 in Tokyo
const at = (iso: string) => Timestamp.fromMillis(Date.parse(iso));
const reminder = (uid: string, noteId: string, extra: Record<string, unknown> = {}) => db.doc(`reminders/${uid}_${noteId}`).set({
  ownerUid: uid, noteId, title: `Title of ${noteId}`, wallTime: '2026-10-30T18:00', timeZone: 'Asia/Tokyo', repeat: 'daily',
  nextAt: at('2026-10-30T09:00Z'), lang: 'ja', updatedAt: Timestamp.now(), ...extra,
});
const plan = (uid: string, value: 'pro' | 'free') => db.doc(`users/${uid}/billing/subscription`).set({ plan: value });
const device = (uid: string, id: string) => db.doc(`users/${uid}/pushSubscriptions/${id}`).set({ endpoint: `https://push.example.test/${id}`, p256dh: 'key', auth: 'secret', createdAt: Timestamp.now() });
const nextAt = async (id: string) => {
  const value = (await db.doc(`reminders/${id}`).get()).data()?.nextAt;
  return value ? (value as Timestamp).toDate().toISOString() : null;
};
function recorder(gone: string[] = []) {
  const sent: { endpoint: string; payload: ReminderPayload }[] = [];
  const send = async (target: PushTarget, payload: ReminderPayload): Promise<Delivery> => {
    if (gone.some(id => target.endpoint.endsWith(id))) return 'gone';
    sent.push({ endpoint: target.endpoint, payload });
    return 'sent';
  };
  return { sent, send };
}

describe.skipIf(!host)('sending reminders (emulator only, specs/25 2.2)', () => {
  beforeEach(async () => {
    await fetch(`http://${host}/emulator/v1/projects/demo-drafta/databases/(default)/documents`, { method: 'DELETE' });
  });

  it('sends a due reminder to every device of a Pro owner and moves it to its next ring', async () => {
    await plan('alice', 'pro'); await device('alice', 'phone'); await device('alice', 'laptop');
    await reminder('alice', 'memo-1');
    const { sent, send } = recorder();
    expect(await sendDueReminders(db, NOW, send)).toMatchObject({ due: 1, sent: 2, notPro: 0 });
    expect(sent.map(item => item.endpoint).sort()).toEqual(['https://push.example.test/laptop', 'https://push.example.test/phone']);
    expect(sent[0].payload).toEqual({ type: 'reminder', noteId: 'memo-1', title: 'Title of memo-1', lang: 'ja' });
    expect(await nextAt('alice_memo-1')).toBe('2026-10-31T09:00:00.000Z');
  });

  it('stops a reminder without repeat after it rings, and leaves future and stopped ones alone', async () => {
    await plan('alice', 'pro'); await device('alice', 'phone');
    await reminder('alice', 'once', { repeat: 'none' });
    await reminder('alice', 'later', { nextAt: at('2026-10-30T09:01Z') });
    await reminder('alice', 'stopped', { nextAt: null });
    const { sent, send } = recorder();
    expect(await sendDueReminders(db, NOW, send)).toMatchObject({ due: 1, sent: 1 });
    expect(sent[0].payload.noteId).toBe('once');
    expect(await nextAt('alice_once')).toBeNull();
    expect(await nextAt('alice_later')).toBe('2026-10-30T09:01:00.000Z');
    expect(await nextAt('alice_stopped')).toBeNull();
  });

  it('does not ring while the owner is not Pro, but moves on', async () => {
    await plan('bob', 'free'); await device('bob', 'phone');
    await reminder('bob', 'memo-1');
    await reminder('carol', 'memo-1'); // no plan at all
    const { sent, send } = recorder();
    expect(await sendDueReminders(db, NOW, send)).toMatchObject({ due: 2, sent: 0, notPro: 2 });
    expect(sent).toEqual([]);
    expect(await nextAt('bob_memo-1')).toBe('2026-10-31T09:00:00.000Z');
  });

  it('forgets a device the push service no longer knows', async () => {
    await plan('alice', 'pro'); await device('alice', 'old'); await device('alice', 'phone');
    await reminder('alice', 'memo-1'); await reminder('alice', 'memo-2');
    const { sent, send } = recorder(['old']);
    const result = await sendDueReminders(db, NOW, send);
    expect(result).toMatchObject({ due: 2, sent: 2 });
    // Reminders of one owner go out side by side, so the dropped device may be tried by both.
    expect(result.gone).toBeGreaterThanOrEqual(1);
    expect(sent.every(item => item.endpoint.endsWith('phone'))).toBe(true);
    expect((await db.doc('users/alice/pushSubscriptions/old').get()).exists).toBe(false);
  });

  it('rings missed times once, and two runs at once send it once', async () => {
    await plan('alice', 'pro'); await device('alice', 'phone');
    await reminder('alice', 'memo-1', { nextAt: at('2026-10-25T09:00Z') }); // five days missed
    const first = recorder(), second = recorder();
    await Promise.all([sendDueReminders(db, NOW, first.send), sendDueReminders(db, NOW, second.send)]);
    expect(first.sent.length + second.sent.length).toBe(1);
    expect(await nextAt('alice_memo-1')).toBe('2026-10-31T09:00:00.000Z');
  });
});
