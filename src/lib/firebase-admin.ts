// Firebase Admin SDK (server-side only)
// Used in Next.js API routes for privileged operations (Auth user creation, Firestore, Storage)

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  // Option B (production): service account JSON injected as an env var string.
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT
  if (saJson) {
    try {
      const serviceAccount = JSON.parse(saJson)
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      })
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var', e)
    }
  }

  // Option A (local dev): path to a service account JSON file.
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (saPath) {
    try {
      const serviceAccount = JSON.parse(readFileSync(resolve(saPath), 'utf8'))
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      })
    } catch (e) {
      console.error('Failed to load Firebase service account from', saPath, e)
    }
  }

  // Last resort: initialize with just projectId (token verification may be limited)
  return initializeApp({ projectId })
}

const adminApp = initAdmin()

export const adminAuth = getAuth(adminApp)
// Initialize Firestore with ignoreUndefinedProperties so we can pass partial objects
// without manually stripping undefined values from every field.
const _db = getFirestore(adminApp)
try {
  _db.settings({ ignoreUndefinedProperties: true })
} catch {
  // settings can only be called once per app instance
}
export const adminDb = _db

/**
 * Verify a Firebase ID token from the client and return the decoded user.
 * Returns { uid, email, ... } or null if invalid.
 */
export async function verifyIdToken(idToken: string) {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    return decoded
  } catch {
    return null
  }
}

/**
 * Get the Firestore user profile for a Firebase UID.
 */
export async function getUserProfile(uid: string) {
  const doc = await adminDb.collection('users').doc(uid).get()
  if (!doc.exists) return null
  return { uid: doc.id, ...doc.data() }
}

/**
 * Verify the ID token from a request header and return the user profile + role.
 * Returns { uid, email, role, ...profile } or null if not authenticated.
 */
export async function getAuthContext(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const idToken = authHeader.substring(7)
  const decoded = await verifyIdToken(idToken)
  if (!decoded) return null

  const profile = await getUserProfile(decoded.uid)
  if (!profile) return null

  const status = (profile as any).status
  if (status && !['ACTIVE', 'ON_LEAVE'].includes(status)) {
    return { uid: decoded.uid, email: decoded.email, role: (profile as any).role, status, inactive: true }
  }

  return { uid: decoded.uid, email: decoded.email, ...(profile as any), inactive: false }
}

/**
 * Create a notification in Firestore.
 */
export async function createNotification(employeeId: string, title: string, message: string, type: string = 'INFO') {
  try {
    await adminDb.collection('notifications').add({
      employeeId, title, message, type, read: false, link: '',
      createdAt: new Date().toISOString(),
    })
  } catch (e) {
    // Non-blocking — notifications are best-effort
  }
}

/**
 * Create an audit log entry.
 */
export async function createAuditLog(actorId: string | null, actorName: string, action: string, entity: string, entityId: string, details: string) {
  try {
    await adminDb.collection('auditLogs').add({
      employeeId: actorId, actorName, action, entity, entityId, details,
      createdAt: new Date().toISOString(),
    })
  } catch (e) {
    // Non-blocking
  }
}
