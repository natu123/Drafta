import webpush from 'web-push';
import type { Delivery, PushTarget, ReminderPayload } from './reminders.js';

/** VAPID identifies Drafta to the push services; the private key lives in Secret Manager. */
export type Vapid = { subject: string; publicKey: string; privateKey: string };

const options = (vapid: Vapid) => ({ vapidDetails: vapid, TTL: 60 * 60, urgency: 'high' as const });
const subscription = (target: PushTarget) => ({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } });

/** The encrypted request to a device's push service (for checks; sending builds the same). */
export const pushRequest = (target: PushTarget, payload: ReminderPayload, vapid: Vapid) =>
  webpush.generateRequestDetails(subscription(target), JSON.stringify(payload), options(vapid));

export function pushSender(vapid: Vapid) {
  return async (target: PushTarget, payload: ReminderPayload): Promise<Delivery> => {
    try {
      await webpush.sendNotification(subscription(target), JSON.stringify(payload), options(vapid));
      return 'sent';
    } catch (error) {
      // 404 and 410: the subscription no longer exists.
      return error instanceof webpush.WebPushError && (error.statusCode === 404 || error.statusCode === 410) ? 'gone' : 'failed';
    }
  };
}
