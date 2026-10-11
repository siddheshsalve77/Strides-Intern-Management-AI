// Client-side Firebase Auth helpers
// Used by the frontend to authenticate with Firebase and get ID tokens for API calls

import { auth } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { onSnapshot, doc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { EmployeeT } from '@/lib/types'

/**
 * Sign in with email and password.
 * Returns the Firebase User or throws on error.
 * Throws a clear configuration error if Firebase public env vars were not
 * inlined at build time (so the platform can still deploy + render).
 */
export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars in the platform build settings and redeploy.'
    )
  }
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

/**
 * Sign out the current user.
 */
export async function logoutUser() {
  if (!auth) return
  await firebaseSignOut(auth)
}

/**
 * Get the current Firebase ID token for API authentication.
 * Returns null if not authenticated.
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * Subscribe to Firebase Auth state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback)
}

/**
 * Fetch wrapper that automatically adds the Firebase ID token to Authorization header.
 * Does NOT override Content-Type for FormData uploads (browser sets multipart boundary).
 */
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getIdToken()
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  // Only set Content-Type for JSON bodies — leave FormData alone so the browser can set the multipart boundary
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...options, headers })
}

/**
 * Subscribe to a user's Firestore profile in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToUserProfile(uid: string, callback: (profile: EmployeeT | null) => void) {
  return onSnapshot(doc(firestore, 'users', uid), (snap) => {
    if (snap.exists()) {
      callback({ uid: snap.id, ...snap.data() } as EmployeeT)
    } else {
      callback(null)
    }
  })
}
