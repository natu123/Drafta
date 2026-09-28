import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, getAuth, initializeAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';

/** Production activation is deliberately absent until cloud setup is approved. */
export function localFirebaseEnabled(mode: string | undefined, hostname: string): boolean {
  if (!mode || mode === 'off') return false;
  if (mode !== 'emulator') throw new Error('Unsupported Firebase mode');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new Error('Firebase emulator mode requires a local browser');
  }
  return true;
}

export function getFirebaseClient() {
  if (typeof window === 'undefined') return null;
  if (!localFirebaseEnabled(process.env.NEXT_PUBLIC_FIREBASE_MODE, window.location.hostname)) return null;
  const name = 'drafta-local';
  const existing = getApps().find(app => app.name === name);
  const app = existing ?? initializeApp({ projectId: 'demo-drafta', apiKey: 'demo-emulator-only', authDomain: 'demo-drafta.firebaseapp.com' }, name);
  const auth = existing ? getAuth(app) : initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  const db = existing ? getFirestore(app) : initializeFirestore(app, { localCache: memoryLocalCache() });
  if (!existing) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return {
    auth, db,
    async login() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return signInWithPopup(auth, provider);
    },
    logout: () => signOut(auth),
  };
}

export type FirebaseClient = NonNullable<ReturnType<typeof getFirebaseClient>>;
