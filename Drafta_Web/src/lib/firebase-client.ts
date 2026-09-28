import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, getAuth, initializeAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';

/** Emulator access never accepts a public hostname. */
export function localFirebaseEnabled(mode: string | undefined, hostname: string): boolean {
  if (!mode || mode === 'off') return false;
  if (mode !== 'emulator') throw new Error('Unsupported Firebase mode');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new Error('Firebase emulator mode requires a local browser');
  }
  return true;
}

export function firebaseOptions(mode: string | undefined, hostname: string, config: FirebaseOptions): FirebaseOptions | null {
  if (mode !== 'production') return localFirebaseEnabled(mode, hostname)
    ? { projectId: 'demo-drafta', apiKey: 'demo-emulator-only', authDomain: 'demo-drafta.firebaseapp.com' } : null;
  if (!['localhost', '127.0.0.1', '[::1]', 'drafta-memo.com', 'drafta-memo.web.app', 'drafta-memo.firebaseapp.com'].includes(hostname)) throw new Error('Unapproved app host');
  if (config.projectId !== 'drafta-memo' || config.authDomain !== 'drafta-memo.firebaseapp.com' ||
      config.appId !== '1:642102711632:web:e1e1f3a8ba7d00eec00855' || !config.apiKey || config.apiKey.startsWith('demo-')) {
    throw new Error('Missing or mismatched production Firebase configuration');
  }
  return { projectId: config.projectId, authDomain: config.authDomain, appId: config.appId, apiKey: config.apiKey };
}

export function getFirebaseClient() {
  if (typeof window === 'undefined') return null;
  const mode = process.env.NEXT_PUBLIC_FIREBASE_MODE;
  const config = firebaseOptions(mode, window.location.hostname, {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  });
  if (!config) return null;
  const name = mode === 'production' ? 'drafta-production' : 'drafta-local';
  const existing = getApps().find(app => app.name === name);
  const app = existing ?? initializeApp(config, name);
  const auth = existing ? getAuth(app) : initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  const db = existing ? getFirestore(app) : initializeFirestore(app, { localCache: memoryLocalCache() });
  if (!existing && mode === 'emulator') {
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
