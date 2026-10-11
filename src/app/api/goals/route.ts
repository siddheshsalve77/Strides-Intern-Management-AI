import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/goals
// Authenticated. Non-managers see only their own goals.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// ?scope=all — HR/Admin: all goals with employee enrichment.
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const scope = searchParams.get('scope')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // HR/Admin scope=all — return all goals (with employee enrichment)
  if (scope === 'all' && hasMinRole(ctx.role, 'HR')) {
    const snap = await adminDb.collection('goals').limit(200).get()
    const goals = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )

    const empIds = [...new Set(goals.map((g: any) => g.employeeId).filter(Boolean))]
    const employees = await Promise.all(
      empIds.map(async (id) => {
        const d = await adminDb.collection('users').doc(id).get()
        return d.exists
          ? {
              uid: d.id,
              name: d.data()!.name,
              designation: d.data()!.designation,
              photoUrl: d.data()!.photoUrl,
            }
          : null
      })
    )
    const empMap = new Map(
      employees.filter(Boolean).map((e: any) => [e.uid || e.id, e])
    )
    const withEmps = goals.map((g: any) => ({
      ...g,
      deadline: g.deadline || null,
      employee: empMap.get(g.employeeId) || null,
    }))
    return NextResponse.json(withEmps)
  }

  // Managers: scope=team — all reportees' goals
  if (scope === 'team' && isManager) {
    const reporteesSnap = await adminDb
      .collection('users')
      .where('managerId', '==', ctx.uid)
      .get()
    const teamUids = [ctx.uid, ...reporteesSnap.docs.map((d) => d.id)]
    const all = await Promise.all(
      teamUids.slice(0, 30).map(async (uid) => {
        const snap = await adminDb
          .collection('goals')
          .where('employeeId', '==', uid)
          .limit(50)
          .get()
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      })
    )
    const goals = all
      .flat()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    return NextResponse.json(
      goals.map((g: any) => ({ ...g, deadline: g.deadline || null }))
    )
  }

  // Resolve target UID for individual queries
  let targetUid: string
  if (!requestedEmployeeId || requestedEmployeeId === 'me') {
    targetUid = ctx.uid
  } else {
    if (!isManager && requestedEmployeeId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // MANAGER role must verify team membership for non-self queries
    if (ctx.role === 'MANAGER' && requestedEmployeeId !== ctx.uid) {
      const empDoc = await adminDb.collection('users').doc(requestedEmployeeId).get()
      if (!empDoc.exists) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
      const empData: any = empDoc.data()
      if (empData.managerId && empData.managerId !== ctx.uid) {
        return NextResponse.json(
          { error: 'Employee is not in your team' },
          { status: 403 }
        )
      }
    }
    targetUid = requestedEmployeeId
  }

  const snap = await adminDb
    .collection('goals')
    .where('employeeId', '==', targetUid)
    .limit(100)
    .get()
  const goals = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )

  return NextResponse.json(
    goals.map((g: any) => ({ ...g, deadline: g.deadline || null }))
  )
}

// ============================================================
// POST /api/goals
// Authenticated. employeeId derived from verified token (canonical).
// Managers+ can create goals for their reportees (via body.employeeId).
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Canonical employeeId — derived from token, NOT client body
  let employeeId = ctx.uid
  if (body.employeeId && body.employeeId !== ctx.uid) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Cannot create goals for another employee' },
        { status: 403 }
      )
    }
    const empDoc = await adminDb.collection('users').doc(body.employeeId).get()
    if (!empDoc.exists) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 400 })
    }
    const empData: any = empDoc.data()
    if (empData.managerId && empData.managerId !== ctx.uid && !hasMinRole(ctx.role, 'HR')) {
      return NextResponse.json(
        { error: 'Employee is not in your team' },
        { status: 403 }
      )
    }
    employeeId = body.employeeId
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('goals').add({
    title: body.title || '',
    description: body.description || '',
    employeeId,
    progress: body.progress || 0,
    status: 'ACTIVE',
    deadline: body.deadline ? new Date(body.deadline).toISOString() : null,
    createdAt: now,
    updatedAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'GOAL',
    ref.id,
    `Created goal "${body.title || ''}"${employeeId !== ctx.uid ? ` for ${employeeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
