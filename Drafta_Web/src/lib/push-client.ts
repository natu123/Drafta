import { doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

/**
 * Receiving reminders on this device (specs/25_reminders.md, 2.3; Gles's choices of 2026-10-30): the
 * permission is asked when a reminder is first set, and the device's Web Push subscription is kept
 * at `users/{uid}/pushSubscriptions`. The service worker (`/sw.js`) is registered only then.
 */
/** `error`: the device allowed notifications but could not be registered with its push service. */
export type PushState = 'granted' | 'default' | 'denied' | 'install' | 'unsupported' | 'error';

const isAppleMobile = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const vapidKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** Whether this device can receive reminders now, needs the permission, or needs Drafta on the home screen. */
export function pushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // An iPhone receives Web Push only in Drafta added to the home screen.
    return isAppleMobile() && !isStandalone() ? 'install' : 'unsupported';
  }
  if (!vapidKey()) return 'unsupported';
  return Notification.permission;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}
async function idOf(endpoint: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)));
  return btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Asks for the permission if needed and keeps this device's subscription. Returns the state after. */
export async function enablePush(db: Firestore, uid: string): Promise<PushState> {
  const before = pushState();
  if (before === 'install' || before === 'unsupported' || before === 'denied') return before;
  const permission = before === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey()) });
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('Incomplete push subscription');
  await setDoc(doc(db, 'users', uid, 'pushSubscriptions', await idOf(endpoint)), { endpoint, p256dh: keys.p256dh, auth: keys.auth, createdAt: serverTimestamp() });
  return 'granted';
}
