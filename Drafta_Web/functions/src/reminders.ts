import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import { isRepeat, nextRing } from './reminder-time.js';

/**
 * Sending reminders (specs/25_reminders.md, 2.2). Each run takes the reminders whose `nextAt` has
 * come, moves each to its next ring (or stops it: `nextAt` null) in a transaction so that no run
 * sends one twice, then sends it to every device of its owner while the owner is Pro. A reminder
 * that comes due while its owner is not Pro moves on silently. Missed rings (the service was down)
 * ring once, not once for each missed time.
 */
export type PushTarget = { endpoint: string; p256dh: string; auth: string };
/** What a device receives; the memo's body is never sent. */
export type ReminderPayload = { type: 'reminder'; noteId: string; title: string; lang: string };
export type Delivery = 'sent' | 'gone' | 'failed';
export type RunResult = { due: number; sent: number; notPro: number; gone: number; failed: number };

/** Reminders taken per run; the rest wait for the next minute. */
export const RUN_LIMIT = 200;
const PARALLEL = 10;

async function claim(db: Firestore, id: string, now: number): Promise<DocumentData | null> {
  const ref = db.collection('reminders').doc(id);
  return db.runTransaction(async transaction => {
    const data = (await transaction.get(ref)).data();
    if (!data || !(data.nextAt instanceof Timestamp) || data.nextAt.toMillis() > now) return null;
    const next = isRepeat(data.repeat) && typeof data.wallTime === 'string' && typeof data.timeZone === 'string'
      ? nextRing(data.wallTime, data.timeZone, data.repeat, now) : null;
    transaction.update(ref, { nextAt: next === null ? null : Timestamp.fromMillis(next) });
    return data;
  });
}

export async function sendDueReminders(db: Firestore, now: number, send: (target: PushTarget, payload: ReminderPayload) => Promise<Delivery>): Promise<RunResult> {
  const result: RunResult = { due: 0, sent: 0, notPro: 0, gone: 0, failed: 0 };
  const due = await db.collection('reminders').where('nextAt', '<=', Timestamp.fromMillis(now)).orderBy('nextAt').limit(RUN_LIMIT).get();
  // One look at each owner's plan and devices per run.
  const owners = new Map<string, Promise<{ pro: boolean; targets: { id: string; target: PushTarget }[] }>>();
  const ownerOf = (uid: string) => {
    let value = owners.get(uid);
    if (!value) {
      value = (async () => {
        const pro = (await db.doc(`users/${uid}/billing/subscription`).get()).data()?.plan === 'pro';
        if (!pro) return { pro, targets: [] };
        const devices = await db.collection(`users/${uid}/pushSubscriptions`).get();
        return { pro, targets: devices.docs.flatMap(device => {
          const { endpoint, p256dh, auth } = device.data();
          return typeof endpoint === 'string' && typeof p256dh === 'string' && typeof auth === 'string' ? [{ id: device.id, target: { endpoint, p256dh, auth } }] : [];
        }) };
      })();
      owners.set(uid, value);
    }
    return value;
  };

  const one = async (id: string) => {
    const reminder = await claim(db, id, now);
    if (!reminder || typeof reminder.ownerUid !== 'string' || typeof reminder.noteId !== 'string') return;
    result.due++;
    const owner = await ownerOf(reminder.ownerUid);
    if (!owner.pro) { result.notPro++; return; }
    const payload: ReminderPayload = { type: 'reminder', noteId: reminder.noteId, title: typeof reminder.title === 'string' ? reminder.title : '', lang: typeof reminder.lang === 'string' ? reminder.lang : 'en' };
    for (const device of [...owner.targets]) {
      const delivery = await send(device.target, payload);
      if (delivery === 'sent') result.sent++;
      else if (delivery === 'failed') result.failed++;
      else {
        // The device withdrew its permission or the browser dropped it.
        result.gone++;
        owner.targets.splice(owner.targets.indexOf(device), 1);
        await db.doc(`users/${reminder.ownerUid}/pushSubscriptions/${device.id}`).delete();
      }
    }
  };
  const ids = due.docs.map(entry => entry.id);
  for (let index = 0; index < ids.length; index += PARALLEL) await Promise.all(ids.slice(index, index + PARALLEL).map(one));
  return result;
}
