'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import { collection, query, where, onSnapshot, limit, type Unsubscribe } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { EmployeeT, NotificationT, TaskT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'
import { toast } from 'sonner'

// ============================================================
// loadUserProfile — Fetch the Firestore profile for a Firebase user
// ============================================================
// Resilient profile loading:
// - Retries transient failures (server may be briefly restarting)
// - Only clears user state on genuine auth rejections (401/403)
// - Shows a clear toast instead of silently bouncing back to login
// Module-level so the login screen can also invoke it after sign-in
// (onAuthStateChanged does NOT re-fire when Firebase is already signed in).
// ============================================================

const SERVER_UNREACHABLE_MSG =
  'The workspace server is unreachable right now. It may be restarting — please try signing in again in a few moments.'

export async function loadUserProfile(user: FirebaseUser): Promise<boolean> {
  try {
    const token = await user.getIdToken()
    useApp.getState().setIdToken(token)
    useApp.getState().setFirebaseUid(user.uid)
    // Retry loop: tolerate brief server restart windows (preview environments).
    // 3 attempts spread over ~4.5s. Auth rejections (401/403) break immediately.
    let finalRes: Response | null = null
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await authedFetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (r.ok) { finalRes = r; break }
        if (r.status === 401 || r.status === 403) { finalRes = r; break }
        lastErr = new Error(`Profile fetch failed with HTTP ${r.status}`)
      } catch (e) {
        lastErr = e
      }
      if (attempt < 2) await new Promise((r2) => setTimeout(r2, 1500 * (attempt + 1)))
    }

    if (finalRes && finalRes.ok) {
      const emp = await finalRes.json() as EmployeeT & { inactive?: boolean }
      if (emp.inactive) {
        // Account is inactive — sign out
        useApp.getState().setEmployee(null)
        if (auth) await signOut(auth)
        return false
      }
      useApp.getState().setEmployee(emp)
      return true
    }

    if (finalRes && (finalRes.status === 401 || finalRes.status === 403)) {
      // Token or profile genuinely rejected — clear state so the user can re-authenticate
      useApp.getState().setEmployee(null)
      toast.error('Your session could not be verified. Please sign in again.')
      return false
    }

    // Transient/server failure after retries — keep any previously-known profile
    // (restored from localStorage) instead of bouncing the user off the shell,
    // but tell them clearly why the dashboard is not loading.
    if (lastErr) console.error('Profile load failed after retries:', lastErr)
    toast.error(SERVER_UNREACHABLE_MSG, { duration: 8000 })
    return false
  } catch (e) {
    console.error('Profile load error:', e)
    toast.error(SERVER_UNREACHABLE_MSG, { duration: 8000 })
    return false
  }
}

// ============================================================
// reloadSessionProfile — Recover a stuck authenticated session
// ============================================================
// Call after an explicit sign-in attempt: if Firebase already has an
// authenticated user but the store has no matching profile (e.g. a previous
// profile load failed while the server was restarting), this loads it now.
// Without this, the user stays on the login screen forever because
// onAuthStateChanged does not re-fire for an already-signed-in user.
// ============================================================

export async function reloadSessionProfile(): Promise<boolean> {
  if (!auth) return false
  const user = auth.currentUser
  if (!user) return false
  const { currentEmployee } = useApp.getState()
  if (currentEmployee && (currentEmployee.id === user.uid || currentEmployee.uid === user.uid)) {
    return true // Profile already loaded for this user
  }
  return loadUserProfile(user)
}

// ============================================================
// useAuthSession — Centralized Firebase Auth lifecycle
// ============================================================
// This hook is mounted ONCE at the app root (page.tsx).
// It handles:
// - onAuthStateChanged
// - Profile fetching from /api/auth/me (with retries — see loadUserProfile)
// - State reset on identity change
// - Logout with full cleanup
// ============================================================

export function useAuthSession() {
  const { resetUserState, logout } = useApp()
  const [authReady, setAuthReady] = useState(false)
  const lastUidRef = useRef<string | null>(null)

  useEffect(() => {
    // If Firebase public env vars weren't inlined at build time (platform
    // deploy without secrets), `auth` is null. Don't crash — mark the session
    // ready so the login screen renders and surfaces a clear error on sign-in.
    if (!auth) {
      // Deferred to satisfy react-hooks/set-state-in-effect (no perceptible delay).
      queueMicrotask(() => setAuthReady(true))
      return
    }
    const unsub = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        // Auth identity changed? Reset all user-scoped state BEFORE loading new user.
        if (lastUidRef.current && lastUidRef.current !== user.uid) {
          resetUserState()
        }
        lastUidRef.current = user.uid

        // Fetch the user's Firestore profile via server (verifies token).
        // loadUserProfile handles transient server restarts with retries and
        // keeps a previously-known profile instead of silently logging out.
        await loadUserProfile(user)
      } else {
        // No Firebase user. ALWAYS clear stale persisted profile data —
        // previously this only ran when lastUidRef was set, which meant a
        // stale `currentEmployee` from localStorage would survive a page
        // load where Firebase reported no session (e.g. session expired,
        // third-party iframe storage partitioning). That left the user
        // staring at a broken dashboard built on a stale, unauthenticated
        // profile. Now we always clear it so the login screen shows.
        const { currentEmployee } = useApp.getState()
        if (currentEmployee) {
          resetUserState()
        }
        lastUidRef.current = null
      }
      setAuthReady(true)
    })

    return () => unsub()
  }, []) // Mount once — internal ref handles identity changes

  // Full logout — signs out Firebase Auth AND clears all state
  const fullLogout = useCallback(async () => {
    try { await signOut(auth) } catch {}
    logout()
    lastUidRef.current = null
  }, [logout])

  return { authReady, fullLogout }
}

// ============================================================
// useUserData — UID-aware data fetching with race protection
// ============================================================
// This hook fetches user-scoped data and ensures:
// - Requests are cancelled (AbortController) when UID changes
// - Stale responses are ignored (uid check before applying state)
// - Data is refetched when dataVersion changes (mutations, etc.)
// ============================================================

export function useUserData<T>(
  fetcher: (uid: string, signal: AbortSignal) => Promise<T>,
  deps: any[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const { currentEmployee, dataVersion } = useApp()
  const uid = currentEmployee?.id || currentEmployee?.uid || null
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeRequestRef = useRef<string | null>(null)

  const refetch = useCallback(() => {
    // Trigger by bumping the internal counter
    setLoading(true)
  }, [])

  useEffect(() => {
    if (!uid) {
      const t = setTimeout(() => { setData(null); setLoading(false) }, 0)
      return () => clearTimeout(t)
    }

    const controller = new AbortController()
    const requestId = `${uid}-${Date.now()}`
    activeRequestRef.current = requestId

    const t = setTimeout(() => { setLoading(true); setError(null) }, 0)

    fetcher(uid, controller.signal)
      .then((result) => {
        // RACE CONDITION PROTECTION: Only apply if this request is still the active one
        if (activeRequestRef.current !== requestId) return
        // Also verify the UID hasn't changed
        const currentUid = useApp.getState().currentEmployee?.id || useApp.getState().currentEmployee?.uid
        if (currentUid !== uid) return

        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return // Ignore aborted requests
        if (activeRequestRef.current !== requestId) return
        setError(err?.message || 'Failed to load')
        setLoading(false)
      })

    return () => {
      clearTimeout(t)
      controller.abort()
      if (activeRequestRef.current === requestId) {
        activeRequestRef.current = null
      }
    }
  }, [uid, dataVersion, ...deps])

  return { data, loading, error, refetch }
}

// ============================================================
// useNotifications — Realtime Firestore listener scoped to current UID
// ============================================================

export function useNotifications() {
  const { currentEmployee } = useApp()
  const uid = currentEmployee?.id || currentEmployee?.uid || null
  const [notifications, setNotifications] = useState<NotificationT[]>([])
  const [loading, setLoading] = useState(true)
  const unsubRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    // CLEANUP: Unsubscribe old listener before starting new one
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    if (!uid) {
      const t = setTimeout(() => { setNotifications([]); setLoading(false) }, 0)
      return () => clearTimeout(t)
    }

    const t = setTimeout(() => setLoading(true), 0)

    // Real-time listener scoped to current user's UID
    const q = query(
      collection(firestore, 'notifications'),
      where('employeeId', '==', uid),
      limit(50)
    )

    unsubRef.current = onSnapshot(q, (snap) => {
      // Verify UID hasn't changed since this listener was created
      const currentUid = useApp.getState().currentEmployee?.id || useApp.getState().currentEmployee?.uid
      if (currentUid !== uid) return // Stale listener — ignore

      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 50) as NotificationT[]
      setNotifications(items)
      setLoading(false)
    }, (err) => {
      console.error('Notification listener error:', err)
      // Fallback: fetch via API
      authedFetch(`/api/notifications?employeeId=${uid}`)
        .then(r => r.json())
        .then(items => { setNotifications(Array.isArray(items) ? items : []); setLoading(false) })
        .catch(() => { setNotifications([]); setLoading(false) })
    })

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [uid]) // Only depend on UID — listener is properly scoped

  return { notifications, loading }
}

// ============================================================
// useRealtimeTasks — Firestore realtime listener for user's tasks
// ============================================================

export function useRealtimeTasks() {
  const { currentEmployee } = useApp()
  const uid = currentEmployee?.id || currentEmployee?.uid || null
  const role = currentEmployee?.role
  const [tasks, setTasks] = useState<TaskT[]>([])
  const [loading, setLoading] = useState(true)
  const unsubRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    // CLEANUP: Unsubscribe old listener
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    if (!uid || !role) {
      const t = setTimeout(() => { setTasks([]); setLoading(false) }, 0)
      return () => clearTimeout(t)
    }

    const t = setTimeout(() => setLoading(true), 0)

    // For managers, listen to tasks they created. For employees/interns, listen to tasks assigned to them.
    const field = ['MANAGER', 'HR', 'ADMIN'].includes(role) ? 'createdBy' : 'assignedTo'
    const q = query(
      collection(firestore, 'tasks'),
      where(field, '==', uid),
      limit(100)
    )

    unsubRef.current = onSnapshot(q, async (snap) => {
      // Verify UID hasn't changed
      const currentUid = useApp.getState().currentEmployee?.id || useApp.getState().currentEmployee?.uid
      if (currentUid !== uid) return

      let taskList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TaskT[]

      // Sort client-side (avoids composite index)
      taskList.sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )

      // Fetch assignee names for display
      const assigneeIds = [...new Set(taskList.map(t => (t as any).assignedTo).filter(Boolean))]
      if (assigneeIds.length > 0) {
        const assignees = await Promise.all(
          assigneeIds.slice(0, 10).map(async (id) => {
            try {
              const doc = await import('firebase/firestore').then(m => m.getDoc(m.doc(firestore, 'users', id)))
              return doc.exists() ? { uid: doc.id, ...doc.data() } : null
            } catch { return null }
          })
        )
        const assigneeMap = new Map(assignees.filter(Boolean).map((a: any) => [a.uid || a.id, a]))
        taskList = taskList.map(t => ({
          ...t,
          assignee: (t as any).assignedTo ? (assigneeMap.get((t as any).assignedTo) || null) : null,
        })) as TaskT[]
      }

      setTasks(taskList)
      setLoading(false)
    }, (err) => {
      console.error('Task listener error:', err)
      // Fallback: fetch via API (authenticated — derives user from token)
      const url = `/api/tasks` // server derives UID from token; default returns manager's created tasks or employee's assigned tasks
      authedFetch(url).then(r => r.json()).then(items => { setTasks(Array.isArray(items) ? items : []); setLoading(false) })
        .catch(() => { setTasks([]); setLoading(false) })
    })

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [uid, role])

  return { tasks, loading }
}

// ============================================================
// useVisibilityRefresh — Refetch data when tab becomes visible
// ============================================================

export function useVisibilityRefresh(onVisible: () => void) {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh if user is still authenticated
        const uid = useApp.getState().currentEmployee?.id || useApp.getState().currentEmployee?.uid
        if (uid) onVisible()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [onVisible])
}
