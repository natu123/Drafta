import type { FirebaseApp } from 'firebase/app';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';

/**
 * Drafta Pro in the app (specs/23_billing_foundation.md, 3.5): the account menu shows it, Stripe's
 * pages take the payment, and the server writes the state this only reads. Until the Pro features
 * exist it shows on the local emulator only, never in production.
 */
export const proEnabled = () => process.env.NEXT_PUBLIC_FIREBASE_MODE === 'emulator';

export type ProView = { plan: 'pro' | 'free'; cancelAt: number | null; currentPeriodEnd: number | null };
const FREE: ProView = { plan: 'free', cancelAt: null, currentPeriodEnd: null };

export function watchPro(db: Firestore, uid: string, onChange: (view: ProView) => void): () => void {
  return onSnapshot(doc(db, 'users', uid, 'billing', 'subscription'), snapshot => {
    const data = snapshot.data();
    if (!data || data.plan !== 'pro') { onChange(FREE); return; }
    const time = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
    onChange({ plan: 'pro', cancelAt: time(data.cancelAt), currentPeriodEnd: time(data.currentPeriodEnd) });
  }, () => onChange(FREE));
}

// The callable functions load only when someone opens Checkout or the portal, not at start-up.
async function callable(app: FirebaseApp, name: 'createCheckoutSession' | 'createPortalSession') {
  const { connectFunctionsEmulator, getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions(app, 'asia-northeast1');
  if (process.env.NEXT_PUBLIC_FIREBASE_MODE === 'emulator' && !(functions as { emulatorOrigin?: string }).emulatorOrigin) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return httpsCallable<object, { url: string }>(functions, name);
}

/** Stripe's page for buying Pro, or for managing the subscription. Only Stripe's own hosts are followed. */
export async function stripePage(app: FirebaseApp, page: 'month' | 'year' | 'manage'): Promise<string> {
  const call = await callable(app, page === 'manage' ? 'createPortalSession' : 'createCheckoutSession');
  const { data } = await call(page === 'manage' ? {} : { interval: page });
  const url = new URL(data.url);
  if (url.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)) throw new Error('Unexpected billing page');
  return url.href;
}
