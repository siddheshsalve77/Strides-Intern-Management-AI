import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/offboarding
// Authenticated. Non-managers see only their own offboarding records.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// HR/Admin without ?employeeId: see all offboarding records.
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // HR/Admin: fetch all records when no specific employeeId
  if (!requestedEmployeeId && hasMinRole(ctx.role, 'HR')) {
    const snap = await adminDb.collection('offboarding').limit(100).get()
    let records = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    records = await enrichWithEmployees(records)
    return NextResponse.json(records)
  }

  // Resolve target UID
  let targetUid: string
  if (!requestedEmployeeId || requestedEmployeeId === 'me') {
    targetUid = ctx.uid
  } else {
    if (!isManager && requestedEmployeeId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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
    .collection('offboarding')
    .where('employeeId', '==', targetUid)
    .limit(100)
    .get()
  let records = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )

  records = await enrichWithEmployees(records)
  return NextResponse.json(records)
}

async function enrichWithEmployees(items: any[]) {
  const empIds = [...new Set(items.map((r: any) => r.employeeId).filter(Boolean))]
  const employees = await Promise.all(
    empIds.map(async (id) => {
      const d = await adminDb.collection('users').doc(id).get()
      return d.exists ? { uid: d.id, ...d.data() } : null
    })
  )
  const empMap = new Map(
    employees.filter(Boolean).map((e: any) => [e.uid || e.id, e])
  )
  return items.map((r: any) => ({
    ...r,
    employee: empMap.get(r.employeeId) || undefined,
  }))
}

// ============================================================
// POST /api/offboarding
// Authenticated. Employees can initiate offboarding for themselves.
// HR/Admin can initiate offboarding on behalf of any employee (via body.employeeId).
// Managers+ can initiate on behalf of their reportees.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Canonical employeeId — derived from token unless acting on behalf
  let employeeId = ctx.uid
  if (body.employeeId && body.employeeId !== ctx.uid) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Cannot initiate offboarding for another employee' },
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

  // Check if offboarding already exists
  const existing = await adminDb
    .collection('offboarding')
    .where('employeeId', '==', employeeId)
    .get()
  if (!existing.empty) {
    return NextResponse.json(
      { error: 'Offboarding already initiated for this employee' },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('offboarding').add({
    ...body,
    employeeId,
    status: 'INITIATED',
    requestedDate: now,
    lastWorkingDay: body.lastWorkingDay
      ? new Date(body.lastWorkingDay).toISOString()
      : null,
    createdAt: now,
    updatedAt: now,
  })

  // Notify manager
  const empDoc = await adminDb.collection('users').doc(employeeId).get()
  if (empDoc.exists && empDoc.data()?.managerId) {
    await createNotification(
      empDoc.data()!.managerId,
      'Offboarding initiated',
      `${empDoc.data()!.name} has initiated offboarding`,
      'INFO'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'OFFBOARDING',
    ref.id,
    `Initiated offboarding${employeeId !== ctx.uid ? ` for ${employeeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// ============================================================
// PATCH /api/offboarding
// Authenticated. Status changes — HR/Admin only (manager+ if it's own team).
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id, status, exitNotes, lastWorkingDay } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const offRef = adminDb.collection('offboarding').doc(id)
  const offDoc = await offRef.get()
  if (!offDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const offData: any = offDoc.data()
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const isSelf = offData.employeeId === ctx.uid

  // Status updates require manager+
  if (status !== undefined && !isManager) {
    return NextResponse.json(
      { error: 'Only managers can update offboarding status' },
      { status: 403 }
    )
  }
  // exitNotes / lastWorkingDay — self or manager+
  if (!isSelf && !isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (ctx.role === 'MANAGER' && !isSelf) {
    const empDoc = await adminDb.collection('users').doc(offData.employeeId).get()
    const empData: any = empDoc.exists ? empDoc.data() : {}
    if (empData.managerId && empData.managerId !== ctx.uid) {
      return NextResponse.json(
        { error: 'Employee is not in your team' },
        { status: 403 }
      )
    }
  }

  const data: any = { updatedAt: new Date().toISOString() }
  if (status) data.status = status
  if (exitNotes !== undefined) data.exitNotes = exitNotes
  if (lastWorkingDay)
    data.lastWorkingDay = new Date(lastWorkingDay).toISOString()

  await offRef.update(data)

  // Notify employee
  if (status) {
    await createNotification(
      offData.employeeId,
      'Offboarding updated',
      `Your offboarding status is now ${status.toLowerCase().replace(/_/g, ' ')}`,
      'INFO'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'OFFBOARDING',
    id,
    `Offboarding ${id}${status ? ` → ${status}` : ''}`
  )

  const doc = await offRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
