// Shared server-side API auth helpers
// Used by Next.js API routes to authenticate requests via Firebase ID token
// and enforce role-based access control.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/firebase-admin'
import type { Role } from '@/lib/types'

export interface AuthContext {
  uid: string
  email: string
  role: Role
  name: string
  inactive: boolean
  [key: string]: any
}

const ROLE_HIERARCHY: Record<Role, number> = {
  INTERN: 1,
  EMPLOYEE: 2,
  MANAGER: 3,
  HR: 4,
  ADMIN: 5,
}

export function hasMinRole(userRole: Role | undefined, minRole: Role): boolean {
  if (!userRole) return false
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0)
}

/**
 * Require an authenticated Firebase session. Returns the auth context or a 401 response.
 * Usage:
 *   const ctx = await requireAuth(req)
 *   if (ctx instanceof NextResponse) return ctx
 */
export async function requireAuth(req: Request): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext(req)
  if (!ctx) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (ctx.inactive) {
    return NextResponse.json(
      { error: 'Account inactive', inactive: true },
      { status: 403 }
    )
  }
  return ctx as unknown as AuthContext
}

/**
 * Require an authenticated session with at least the specified role.
 */
export async function requireRole(
  req: Request,
  minRole: Role
): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  if (!hasMinRole(ctx.role, minRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }
  return ctx
}

/**
 * Returns true if the user can manage other users (manager+ or HR/Admin).
 */
export function canManageOthers(role: Role | undefined): boolean {
  return hasMinRole(role, 'MANAGER')
}
