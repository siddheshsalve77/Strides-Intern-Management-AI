import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/requests
// Authenticated. Non-managers see only their own service requests.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// ?scope=team — managers see their team's requests.
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const scope = searchParams.get('scope')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Team scope (managers+)
  if (scope === 'team' && isManager) {
    const reporteesSnap = await adminDb
      .collection('users')
      .where('managerId', '==', ctx.uid)
      .get()
    const teamUids = [ctx.uid, ...reporteesSnap.docs.map((d) => d.id)]
    const all = await Promise.all(
      teamUids.slice(0, 30).map(async (uid) => {
        const snap = await adminDb
          .collection('hrRequests')
          .where('employeeId', '==', uid)
          .limit(50)
          .get()
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      })
    )
    let reqs = all
      .flat()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    reqs = await enrichWithEmployees(reqs)
    return NextResponse.json(reqs)
  }

  // HR/Admin can fetch all requests (no employeeId filter)
  if (!requestedEmployeeId && hasMinRole(ctx.role, 'HR')) {
    const snap = await adminDb.collection('hrRequests').limit(200).get()
    let reqs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    reqs = await enrichWithEmployees(reqs)
    return NextResponse.json(reqs)
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
    .collection('hrRequests')
    .where('employeeId', '==', targetUid)
    .limit(200)
    .get()
  let reqs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )

  reqs = await enrichWithEmployees(reqs)
  return NextResponse.json(reqs)
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
// POST /api/requests
// Authenticated. employeeId derived from verified token (canonical).
// Managers+ can submit on behalf of reportees via body.employeeId.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Canonical employeeId — derived from token
  let employeeId = ctx.uid
  if (body.employeeId && body.employeeId !== ctx.uid) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Cannot submit requests for another employee' },
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

  const count = (await adminDb.collection('hrRequests').get()).size
  const ticketId = `STR-${(body.category || 'HR')
    .substring(0, 3)
    .toUpperCase()}-${(1100 + count).toString()}`

  const now = new Date().toISOString()
  const ref = await adminDb.collection('hrRequests').add({
    ticketId,
    employeeId,
    category: body.category || 'HR',
    subject: body.subject || '',
    description: body.description || '',
    priority: body.priority || 'MEDIUM',
    status: 'CREATED',
    assignedTo: '',
    resolution: '',
    createdAt: now,
    updatedAt: now,
  })

  await createNotification(
    employeeId,
    'Service request created',
    `Your ${body.category || 'HR'} request "${body.subject}" was created. Ticket: ${ticketId}`,
    'REQUEST'
  )

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'REQUEST',
    ref.id,
    `Created ticket ${ticketId}${employeeId !== ctx.uid ? ` on behalf of ${employeeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// ============================================================
// PATCH /api/requests  (id in body)
// Authenticated.
// - Owner can update priority/subject (self-service) on own request.
// - Managers+/HR/Admin can update status/assignment/resolution.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id, status, assignedTo, resolution, priority } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const reqRef = adminDb.collection('hrRequests').doc(id)
  const reqDoc = await reqRef.get()
  if (!reqDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const reqData: any = reqDoc.data()
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const isSelf = reqData.employeeId === ctx.uid

  // Status/assignment/resolution changes require manager+
  if (status !== undefined || assignedTo !== undefined || resolution !== undefined) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Only managers can update request status/assignment' },
        { status: 403 }
      )
    }
  }

  // Priority updates — self or manager+
  if (priority !== undefined && !isSelf && !isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data: any = { updatedAt: new Date().toISOString() }
  if (status) data.status = status
  if (assignedTo !== undefined) data.assignedTo = assignedTo
  if (resolution !== undefined) data.resolution = resolution
  if (priority) data.priority = priority

  await reqRef.update(data)

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'REQUEST',
    id,
    `Request ${id} updated${status ? ` → ${status}` : ''}`
  )

  const doc = await reqRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
