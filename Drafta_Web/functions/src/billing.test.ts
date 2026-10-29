import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { billingState, isNewer, parseInterval, subscriptionIdOf, uidOf } from './billing.js';

const subscription = (status: Stripe.Subscription.Status, extra: Partial<Stripe.Subscription> = {}) => ({
  object: 'subscription', id: 'sub_1', status, cancel_at_period_end: false, metadata: { uid: 'alice' },
  items: { data: [{ current_period_end: 1_800_000_000, price: { recurring: { interval: 'year' } } }] },
  ...extra,
}) as unknown as Stripe.Subscription;
const event = (object: object, created = 100) => ({ created, data: { object } }) as unknown as Stripe.Event;

describe('billing state', () => {
  it('is Pro while active, trialing or retrying a failed payment, and free otherwise', () => {
    for (const status of ['active', 'trialing', 'past_due'] as const) expect(billingState(subscription(status), 1).plan).toBe('pro');
    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'] as const) expect(billingState(subscription(status), 1).plan).toBe('free');
  });
  it('reads the interval and the period end from the item, in milliseconds', () => {
    const state = billingState(subscription('active', { cancel_at_period_end: true }), 5);
    expect(state).toMatchObject({ interval: 'year', currentPeriodEnd: 1_800_000_000_000, cancelAtPeriodEnd: true, sourceEventCreated: 5 });
  });
  it('sees a cancellation booked by date, as the Customer Portal books it', () => {
    const state = billingState(subscription('active', { cancel_at_period_end: false, cancel_at: 1_800_000_000 }), 5);
    expect(state).toMatchObject({ plan: 'pro', cancelAtPeriodEnd: true, cancelAt: 1_800_000_000_000 });
    expect(billingState(subscription('active'), 5)).toMatchObject({ cancelAtPeriodEnd: false, cancelAt: null });
    expect(billingState(subscription('active', { cancel_at_period_end: true }), 5)).toMatchObject({ cancelAtPeriodEnd: true, cancelAt: 1_800_000_000_000 });
  });
  it('is free without a subscription', () => {
    expect(billingState(null, 7)).toEqual({ plan: 'free', status: 'none', interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, cancelAt: null, sourceEventCreated: 7 });
  });
  it('never lets an older event overwrite a newer state', () => {
    expect(isNewer(undefined, 1)).toBe(true);
    expect(isNewer({ sourceEventCreated: 10 }, 10)).toBe(true);
    expect(isNewer({ sourceEventCreated: 10 }, 9)).toBe(false);
  });
});

describe('event routing', () => {
  it('finds the subscription of a subscription event and of a completed checkout', () => {
    expect(subscriptionIdOf(event({ object: 'subscription', id: 'sub_9' }))).toBe('sub_9');
    expect(subscriptionIdOf(event({ object: 'checkout.session', subscription: 'sub_8' }))).toBe('sub_8');
    expect(subscriptionIdOf(event({ object: 'checkout.session', subscription: null }))).toBeNull();
    expect(subscriptionIdOf(event({ object: 'invoice' }))).toBeNull();
  });
  it('takes the account from the subscription, then the session, and rejects odd ids', () => {
    expect(uidOf(event({ object: 'checkout.session', client_reference_id: 'bob' }), subscription('active'))).toBe('alice');
    expect(uidOf(event({ object: 'checkout.session', client_reference_id: 'bob' }), null)).toBe('bob');
    expect(uidOf(event({ object: 'subscription', metadata: { uid: 'a/b' } }), null)).toBeNull();
  });
  it('accepts only monthly and yearly', () => {
    expect(parseInterval('month')).toBe('month');
    expect(parseInterval('year')).toBe('year');
    expect(parseInterval('week')).toBeNull();
    expect(parseInterval(undefined)).toBeNull();
  });
});
