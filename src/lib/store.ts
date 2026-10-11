'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewId, Role, EmployeeT } from './types'

interface AppState {
  // Auth / session — Firebase UID is the canonical identity
  currentEmployee: EmployeeT | null
  firebaseUid: string | null
  idToken: string | null
  // Data version — increments on every auth identity change.
  // Components use this in useEffect deps to trigger refetch when user changes.
  dataVersion: number
  // Navigation (not user-scoped, survives login switch)
  view: ViewId
  // task detail (user-scoped, must be cleared on identity change)
  selectedTaskId: string | null
  selectedEmployeeId: string | null
  selectedProjectId: string | null
  // sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  // actions
  setView: (v: ViewId) => void
  setEmployee: (e: EmployeeT | null) => void
  setFirebaseUid: (uid: string | null) => void
  setIdToken: (token: string | null) => void
  setSidebarOpen: (b: boolean) => void
  setSidebarCollapsed: (b: boolean) => void
  setSelectedTaskId: (id: string | null) => void
  setSelectedEmployeeId: (id: string | null) => void
  setSelectedProjectId: (id: string | null) => void
  // Reset ALL user-scoped state — called when Firebase Auth identity changes.
  // This clears everything except navigation/sidebar state.
  resetUserState: () => void
  // Increment dataVersion to signal components to refetch
  bumpDataVersion: () => void
  // Full logout — clears everything including navigation
  logout: () => void
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      currentEmployee: null,
      firebaseUid: null,
      idToken: null,
      dataVersion: 0,
      view: 'dashboard',
      selectedTaskId: null,
      selectedEmployeeId: null,
      selectedProjectId: null,
      sidebarOpen: false,
      sidebarCollapsed: false,
      setView: (v) => set({ view: v, selectedTaskId: null }),
      setEmployee: (e) => set({ currentEmployee: e }),
      setFirebaseUid: (uid) => set({ firebaseUid: uid }),
      setIdToken: (token) => set({ idToken: token }),
      setSidebarOpen: (b) => set({ sidebarOpen: b }),
      setSidebarCollapsed: (b) => set({ sidebarCollapsed: b }),
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setSelectedEmployeeId: (id) => set({ selectedEmployeeId: id }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      // CRITICAL: Called when Firebase Auth identity changes (login/logout/switch).
      // Clears ALL user-scoped state to prevent stale data from previous user.
      resetUserState: () => set({
        currentEmployee: null,
        firebaseUid: null,
        idToken: null,
        selectedTaskId: null,
        selectedEmployeeId: null,
        selectedProjectId: null,
        view: 'dashboard',
        // Increment dataVersion so all components that depend on it refetch
        dataVersion: get().dataVersion + 1,
      }),

      // Bump dataVersion to trigger refetches without clearing auth state
      bumpDataVersion: () => set({ dataVersion: get().dataVersion + 1 }),

      logout: () => set({
        currentEmployee: null,
        firebaseUid: null,
        idToken: null,
        dataVersion: get().dataVersion + 1,
        view: 'dashboard',
        selectedTaskId: null,
        selectedEmployeeId: null,
        selectedProjectId: null,
      }),
    }),
    {
      name: 'strides-one-store',
      // Only persist non-volatile, UI-useful state.
      // - idToken is NEVER persisted: it expires after 1h and a stale persisted
      //   token caused confusing auth states. authedFetch always re-mints via
      //   auth.currentUser.getIdToken(), so we don't need it persisted.
      // - currentEmployee/firebaseUid ARE persisted for optimistic dashboard
      //   display on reload; useAuthSession verifies them on mount and clears
      //   them if Firebase reports no session.
      partialize: (state) => ({
        currentEmployee: state.currentEmployee,
        firebaseUid: state.firebaseUid,
        view: state.view,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

export const roleLabel: Record<Role, string> = {
  EMPLOYEE: 'Employee',
  INTERN: 'Intern',
  MANAGER: 'Manager',
  HR: 'HR',
  ADMIN: 'Admin',
}
