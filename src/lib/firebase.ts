// Firebase client-side SDK (browser only)
// This is safe to expose — Firebase security is enforced by Firestore Rules + Security Rules, not by hiding config

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// ─── Defensive initialization ────────────────────────────────────────────────
// NEXT_PUBLIC_* env vars are inlined into the client bundle at BUILD time.
// If a platform deploy runs `next build` without these vars configured in the
// dashboard, firebaseConfig.apiKey is `undefined` and `initializeApp()` throws
// `auth/invalid-api-key` during static prerender of the "/" page — which aborts
// the build with "Sorry, there was a problem deploying the code".
//
// Guard: skip initialization when the required public keys are missing. Exports
// become `null` and any auth/firestore call surfaces a clear runtime error only
// when actually invoked (not at import / prerender). This makes the build
// crash-proof regardless of platform env-var configuration state.
const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.appId)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null

if (hasFirebaseConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig as Record<string, string>)
    auth = getAuth(app)
    firestore = getFirestore(app)
  } catch (e) {
    // Runtime init failure (e.g. corrupted IndexedDB persistence, blocked
    // storage in a third-party iframe, or a transient platform env regression).
    // Degrade gracefully instead of crashing the whole app at module load:
    // exports stay null → useAuthSession marks the session ready without a
    // Firebase listener → LoginScreen renders → sign-in surfaces a clear
    // error rather than a blank "client-side exception" page.
    console.error('[firebase] init failed — degrading to auth=null:', e)
    app = null
    auth = null
    firestore = null
  }
}

export { app, auth, firestore }

/**
 * True when Firebase client config was inlined at build time. Components can
 * use this to render a clear "configuration missing" banner instead of letting
 * auth calls throw an opaque null-deref in the browser.
 */
export const isFirebaseConfigured = hasFirebaseConfig
