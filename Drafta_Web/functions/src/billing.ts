import type Stripe from 'stripe';

/**
 * The Pro state as the app reads it from `/users/{uid}/billing/subscription` (specs/23, 3.2). Only these
 * functions write it; the Firestore rules let its owner read it and nobody write it.
 */
export type BillingState = {
  plan: 'pro' | 'free';
  /** Stripe's subscription status (an open set in the SDK), or 'none'. */
  status: string;
  interval: 'month' | 'year' | null;
  /** Milliseconds since the epoch; null without a subscription. */
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  /** Stripe's creation time (seconds) of the event this state came from, to keep older events from overwriting it. */
  sourceEventCreated: number;
};

/**
 * Pro while the subscription is active or trialing, and while Stripe retries a failed payment
 * (past_due): a card that expired unnoticed should not stop the features of someone who meant to stay
 * (2026-10-29, Gles's choice; specs/23, 6).
 */
export const PRO_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing', 'past_due']);

export function billingState(subscription: Stripe.Subscription | null, eventCreated: number): BillingState {
  if (!subscription) return { plan: 'free', status: 'none', interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, sourceEventCreated: eventCreated };
  const item = subscription.items.data[0];
  const interval = item?.price.recurring?.interval;
  // From the 2025-03-31 API on, the period sits on each item rather than the subscription.
  const periodEnd = item?.current_period_end ?? (subscription as unknown as { current_period_end?: number }).current_period_end;
  return {
    plan: PRO_STATUSES.has(subscription.status) ? 'pro' : 'free',
    status: subscription.status,
    interval: interval === 'month' ? 'month' : interval === 'year' ? 'year' : null,
    currentPeriodEnd: typeof periodEnd === 'number' ? periodEnd * 1000 : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    sourceEventCreated: eventCreated,
  };
}

/** Events arrive late, twice, or out of order: an older one never overwrites a newer state. */
export function isNewer(stored: Pick<BillingState, 'sourceEventCreated'> | undefined, eventCreated: number): boolean {
  return !stored || eventCreated >= stored.sourceEventCreated;
}

/** The events that can change the Pro state. Others are acknowledged and ignored. */
export const HANDLED_EVENTS: ReadonlySet<string> = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

/** The subscription an event is about, by id, so the current state can be fetched from Stripe. */
export function subscriptionIdOf(event: Stripe.Event): string | null {
  const object = event.data.object as { object?: string; id?: string; subscription?: string | { id: string } | null };
  if (object.object === 'subscription') return object.id ?? null;
  if (object.object === 'checkout.session') return typeof object.subscription === 'string' ? object.subscription : object.subscription?.id ?? null;
  return null;
}

/** The Drafta account an event belongs to: the uid put on the session and the subscription when buying. */
export function uidOf(event: Stripe.Event, subscription: Stripe.Subscription | null): string | null {
  const object = event.data.object as { object?: string; client_reference_id?: string | null; metadata?: Record<string, string> | null };
  const uid = subscription?.metadata?.uid ?? object.metadata?.uid ?? (object.object === 'checkout.session' ? object.client_reference_id : null) ?? null;
  return uid && /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : null;
}

export type Interval = 'month' | 'year';
export function parseInterval(value: unknown): Interval | null {
  return value === 'month' || value === 'year' ? value : null;
}
