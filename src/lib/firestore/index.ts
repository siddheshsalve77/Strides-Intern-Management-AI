// Firestore data-access layer for STRIDES ONE
// All Firestore collection names, type definitions, and helper functions
// This replaces the Prisma data layer — server-side only via Firebase Admin SDK

import { adminDb } from '@/lib/firebase-admin'
import {
  collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc,
  deleteDoc, serverTimestamp, Timestamp, type DocumentData, type QueryConstraint,
} from 'firebase-admin/firestore'

// ============================================================
// COLLECTION NAMES (source of truth)
// ============================================================
export const COLLECTIONS = {
  USERS: 'users',
  DEPARTMENTS: 'departments',
  HOLIDAYS: 'holidays',
  ATTENDANCE: 'attendance',
  LEAVE_BALANCES: 'leaveBalances',
  LEAVE_REQUESTS: 'leaveRequests',
  PROJECTS: 'projects',
  PROJECT_MEMBERS: 'projectMembers',
  TASKS: 'tasks',
  TASK_SUBMISSIONS: 'taskSubmissions',
  REVIEW_REQUESTS: 'reviewRequests',
  PERFORMANCE: 'performance',
  GOALS: 'goals',
  LEARNING: 'learning',
  DOCUMENTS: 'documents',
  HR_REQUESTS: 'hrRequests',
  ANNOUNCEMENTS: 'announcements',
  NOTIFICATIONS: 'notifications',
  ASSETS: 'assets',
  EXPENSES: 'expenses',
  AUDIT_LOGS: 'auditLogs',
  ONBOARDING_TASKS: 'onboardingTasks',
  TRAVEL_REQUESTS: 'travelRequests',
  OFFBOARDING: 'offboarding',
  MEETINGS: 'meetings',
  BATCHES: 'batches',
} as const

// ============================================================
// HELPER: Convert Firestore Timestamps to ISO strings
// ============================================================
export function serializeDoc<T = DocumentData>(doc: any): T {
  if (!doc || !doc.exists) return null as T
  const data = doc.data ? doc.data() : doc
  const result: any = { id: doc.id, ...data }
  // Convert all Timestamp fields to ISO strings
  for (const key of Object.keys(result)) {
    const val = result[key]
    if (val && typeof val.toISOString === 'function') {
      result[key] = val.toISOString()
    } else if (val && typeof val === 'object' && val._seconds !== undefined) {
      result[key] = new Date(val._seconds * 1000).toISOString()
    }
  }
  return result as T
}

export function serializeDocs<T = DocumentData[]>(docs: any[]): T[] {
  return docs.map((d) => serializeDoc<T>(d))
}

// ============================================================
// GENERIC CRUD REPOSITORY
// ============================================================
export class FirestoreRepo<T extends DocumentData> {
  constructor(private colName: string) {}

  async getAll(constraints: QueryConstraint[] = [], limitCount = 100): Promise<T[]> {
    let q: any = collection(adminDb, this.colName)
    for (const c of constraints) q = query(q, c)
    q = query(q, limitCount)
    const snap = await getDocs(q)
    return snap.docs.map((d) => serializeDoc<T>(d))
  }

  async getById(id: string): Promise<T | null> {
    const d = await getDoc(doc(adminDb, this.colName, id))
    if (!d.exists) return null
    return serializeDoc<T>(d)
  }

  async create(data: Partial<T>): Promise<T> {
    const ref = await addDoc(collection(adminDb, this.colName), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any)
    return { id: ref.id, ...data } as T
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    await updateDoc(doc(adminDb, this.colName, id), {
      ...data,
      updatedAt: new Date().toISOString(),
    } as any)
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(adminDb, this.colName, id))
  }

  async where(field: string, op: any, value: any, limitCount = 100): Promise<T[]> {
    return this.getAll([where(field, op, value)], limitCount)
  }

  async whereIn(field: string, values: any[], limitCount = 100): Promise<T[]> {
    // Firestore doesn't support IN with >10 items, handle in memory if needed
    if (values.length === 0) return []
    const chunks: any[][] = []
    for (let i = 0; i < values.length; i += 10) {
      chunks.push(values.slice(i, i + 10))
    }
    const results: T[] = []
    for (const chunk of chunks) {
      const snap = await getDocs(query(collection(adminDb, this.colName), where(field, 'in', chunk)))
      results.push(...snap.docs.map((d) => serializeDoc<T>(d)))
    }
    return results
  }
}

// ============================================================
// COLLECTION REPOSITORIES
// ============================================================
export const usersRepo = new FirestoreRepo(COLLECTIONS.USERS)
export const tasksRepo = new FirestoreRepo(COLLECTIONS.TASKS)
export const attendanceRepo = new FirestoreRepo(COLLECTIONS.ATTENDANCE)
export const leaveRepo = new FirestoreRepo(COLLECTIONS.LEAVE_REQUESTS)
export const leaveBalanceRepo = new FirestoreRepo(COLLECTIONS.LEAVE_BALANCES)
export const notificationsRepo = new FirestoreRepo(COLLECTIONS.NOTIFICATIONS)
export const announcementsRepo = new FirestoreRepo(COLLECTIONS.ANNOUNCEMENTS)
export const departmentsRepo = new FirestoreRepo(COLLECTIONS.DEPARTMENTS)
export const holidaysRepo = new FirestoreRepo(COLLECTIONS.HOLIDAYS)
export const projectsRepo = new FirestoreRepo(COLLECTIONS.PROJECTS)
export const projectMembersRepo = new FirestoreRepo(COLLECTIONS.PROJECT_MEMBERS)
export const performanceRepo = new FirestoreRepo(COLLECTIONS.PERFORMANCE)
export const goalsRepo = new FirestoreRepo(COLLECTIONS.GOALS)
export const learningRepo = new FirestoreRepo(COLLECTIONS.LEARNING)
export const documentsRepo = new FirestoreRepo(COLLECTIONS.DOCUMENTS)
export const hrRequestsRepo = new FirestoreRepo(COLLECTIONS.HR_REQUESTS)
export const assetsRepo = new FirestoreRepo(COLLECTIONS.ASSETS)
export const expensesRepo = new FirestoreRepo(COLLECTIONS.EXPENSES)
export const auditLogsRepo = new FirestoreRepo(COLLECTIONS.AUDIT_LOGS)
export const onboardingRepo = new FirestoreRepo(COLLECTIONS.ONBOARDING_TASKS)
export const travelRepo = new FirestoreRepo(COLLECTIONS.TRAVEL_REQUESTS)
export const offboardingRepo = new FirestoreRepo(COLLECTIONS.OFFBOARDING)
export const meetingsRepo = new FirestoreRepo(COLLECTIONS.MEETINGS)
export const batchesRepo = new FirestoreRepo(COLLECTIONS.BATCHES)
export const submissionsRepo = new FirestoreRepo(COLLECTIONS.TASK_SUBMISSIONS)
export const reviewRequestsRepo = new FirestoreRepo(COLLECTIONS.REVIEW_REQUESTS)

// ============================================================
// AUTH HELPERS (used by API routes)
// ============================================================
export { getAuthContext, createNotification, createAuditLog } from '@/lib/firebase-admin'
export type AuthContext = {
  uid: string
  email: string
  role: string
  status: string
  inactive: boolean
  [key: string]: any
}
