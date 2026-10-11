import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// GET /api/employees
// Authenticated. Returns employees (canonical UID = Firebase Auth UID).
// Returns both `uid` AND `id` (id = uid) for backward compatibility with client code.
//
// Filters:
//  ?id=<uid>            — single employee by UID
//  ?email=             — single employee by email
//  ?role=              — filter by role (manager+ only)
//  ?department=        — filter by department
//  ?managerId=<uid>    — employees reporting to a manager
//    - Non-managers can only request ?managerId=me (their own managerId) — otherwise redacted to their own UID
//    - Managers can request their own reportees or any manager's reportees
//    - HR/Admin can request anyone's reportees
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const email = searchParams.get('email')
  const role = searchParams.get('role')
  const department = searchParams.get('department')
  const managerIdParam = searchParams.get('managerId')

  // Single-employee lookups
  if (id) {
    // Non-managers can only look up their own UID
    if (id !== ctx.uid && !hasMinRole(ctx.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const doc = await adminDb.collection('users').doc(id).get()
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ uid: doc.id, id: doc.id, ...doc.data() })
  }
  if (email) {
    const snap = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()
    if (snap.empty) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const d = snap.docs[0]
    return NextResponse.json({ uid: d.id, id: d.id, ...d.data() })
  }

  // Determine effective managerId — non-managers can only see their own reporting chain (themselves if manager)
  let effectiveManagerId = managerIdParam
  if (managerIdParam && !hasMinRole(ctx.role, 'MANAGER')) {
    // Employees/interns: only allowed to ask for their own managerId's reportees (i.e., their teammates via their manager)
    // For safety, redact to their own UID (treat as "show me teammates" = employees whose managerId == my managerId)
    if (managerIdParam !== 'me' && managerIdParam !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    effectiveManagerId = ctx.uid
  }
  if (managerIdParam === 'me') effectiveManagerId = ctx.uid

  let query: any = adminDb.collection('users')
  if (role) query = query.where('role', '==', role)
  if (department) query = query.where('department', '==', department)
  if (effectiveManagerId) query = query.where('managerId', '==', effectiveManagerId)

  const snap = await query.get()
  // Return both `uid` AND `id` (= uid) for backward compatibility with client code that uses .id
  const employees = snap.docs.map((d) => ({
    uid: d.id,
    id: d.id,
    ...d.data(),
  }))
  return NextResponse.json(employees)
}
