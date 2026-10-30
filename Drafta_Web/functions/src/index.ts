import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall, onRequest } from 'firebase-functions/https';
import { logger } from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import Stripe from 'stripe';
import { billingState, HANDLED_EVENTS, isNewer, parseInterval, subscriptionIdOf, uidOf, type BillingState } from './billing.js';
import { pushSender } from './push.js';
import { sendDueReminders } from './reminders.js';

/**
 * Drafta Pro billing (specs/23_billing_foundation.md): the app opens Stripe's hosted Checkout and
 * Customer Portal through the two callable functions, and Stripe's signed webhook writes the Pro state
 * that the app only reads. Card details never reach Drafta. Reminders are sent at the end of this file.
 */
setGlobalOptions({ region: 'asia-northeast1', maxInstances: 5 });
initializeApp();
const db = getFirestore();

// The keys live in Secret Manager (in the emulator, functions/.secret.local). Never in code or logs.
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
// Not secret: the prices of the Drafta Pro product and where Checkout returns to.
const priceMonth = defineString('STRIPE_PRICE_MONTH');
const priceYear = defineString('STRIPE_PRICE_YEAR');
const appOrigin = defineString('APP_ORIGIN', { default: 'https://drafta-memo.com' });

let client: Stripe | null = null;
const stripe = () => (client ??= new Stripe(stripeSecretKey.value()));

const billingRef = (uid: string) => db.doc(`users/${uid}/billing/subscription`) as DocumentReference<BillingState>;
const customerRef = (uid: string) => db.doc(`billingCustomers/${uid}`) as DocumentReference<{ customerId: string }>;

async function customerFor(uid: string, email: string | undefined): Promise<string> {
  const saved = (await customerRef(uid).get()).data()?.customerId;
  if (saved) return saved;
  const customer = await stripe().customers.create({ email, metadata: { uid } }, { idempotencyKey: `customer-${uid}` });
  await customerRef(uid).set({ customerId: customer.id });
  return customer.id;
}

/** Opens Checkout for Pro, monthly or yearly. Reaching the success page grants nothing: the webhook does. */
export const createCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const interval = parseInterval((request.data as { interval?: unknown } | null)?.interval);
  if (!interval) throw new HttpsError('invalid-argument', 'interval must be month or year.');
  if ((await billingRef(uid).get()).data()?.plan === 'pro') throw new HttpsError('already-exists', 'Already Pro.');
  const customer = await customerFor(uid, request.auth?.token.email);
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: uid,
    line_items: [{ price: interval === 'month' ? priceMonth.value() : priceYear.value(), quantity: 1 }],
    // Stripe is the merchant of record: tax, fraud and disputes (2026-10-29, Gles's choice; specs/23, 6).
    managed_payments: { enabled: true },
    subscription_data: { metadata: { uid } },
    metadata: { uid },
    success_url: `${appOrigin.value()}/app/?billing=done`,
    cancel_url: `${appOrigin.value()}/app/?billing=cancel`,
  });
  if (!session.url) throw new HttpsError('internal', 'Checkout did not return a URL.');
  return { url: session.url };
});

/** Opens the Customer Portal: payment method, monthly or yearly, cancelling, receipts. */
export const createPortalSession = onCall({ secrets: [stripeSecretKey] }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const customerId = (await customerRef(uid).get()).data()?.customerId;
  if (!customerId) throw new HttpsError('failed-precondition', 'No subscription yet.');
  const session = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${appOrigin.value()}/app/` });
  return { url: session.url };
});

/**
 * Stripe's events, signature checked. Each event is handled once; the subscription is fetched anew, so
 * the state written is Stripe's current one, and an older event never overwrites a newer state.
 * A failure answers 500 so that Stripe sends the event again. No customer details go to the logs.
 */
export const stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(req.rawBody, req.get('stripe-signature') ?? '', stripeWebhookSecret.value());
  } catch {
    res.status(400).send('Invalid signature');
    return;
  }
  if (!HANDLED_EVENTS.has(event.type)) { res.status(200).send('Ignored'); return; }
  try {
    const eventRef = db.doc(`stripeEvents/${event.id}`);
    if ((await eventRef.get()).exists) { res.status(200).send('Already handled'); return; }
    const subscriptionId = subscriptionIdOf(event);
    const subscription = subscriptionId ? await stripe().subscriptions.retrieve(subscriptionId) : null;
    const uid = uidOf(event, subscription);
    if (!uid) {
      logger.warn('Stripe event without a Drafta account', { id: event.id, type: event.type });
      await eventRef.set({ type: event.type, created: event.created, skipped: 'no-account' });
      res.status(200).send('No account');
      return;
    }
    const next = billingState(subscription, event.created);
    await db.runTransaction(async transaction => {
      if ((await transaction.get(eventRef)).exists) return;
      const ref = billingRef(uid);
      const stored = (await transaction.get(ref)).data();
      if (isNewer(stored, event.created)) transaction.set(ref, next);
      if (subscription && typeof subscription.customer === 'string') transaction.set(customerRef(uid), { customerId: subscription.customer });
      transaction.set(eventRef, { type: event.type, created: event.created });
    });
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Stripe event failed', { id: event.id, type: event.type, message: error instanceof Error ? error.message : String(error) });
    res.status(500).send('Failed');
  }
});

// Reminders (specs/25_reminders.md): every minute, the reminders that have come due are sent by Web
// Push. The VAPID private key lives in Secret Manager (in the emulator, functions/.secret.local).
const vapidPrivateKey = defineSecret('VAPID_PRIVATE_KEY');
const vapidPublicKey = defineString('VAPID_PUBLIC_KEY');
const vapidSubject = defineString('VAPID_SUBJECT', { default: 'https://drafta-memo.com' });

export const sendReminders = onSchedule({ schedule: 'every 1 minutes', timeZone: 'Etc/UTC', secrets: [vapidPrivateKey], retryCount: 0 }, async () => {
  const send = pushSender({ subject: vapidSubject.value(), publicKey: vapidPublicKey.value(), privateKey: vapidPrivateKey.value() });
  // Counts only: titles and devices stay out of the logs.
  const result = await sendDueReminders(db, Date.now(), send);
  if (result.due > 0) logger.info('Reminders sent', result);
});
