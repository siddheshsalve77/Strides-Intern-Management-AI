import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/travel
// Authenticated. Non-managers see only their own travel requests.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// ?scope=team — managers see their team's travel.
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
          .collection('travelRequests')
          .where('employeeId', '==', uid)
          .limit(50)
          .get()
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      })
    )
    let requests = all
      .flat()
      .sort(
        (a: any, b: any) =>
          new Date(b.appliedAt || b.createdAt || 0).getTime() -
          new Date(a.appliedAt || a.createdAt || 0).getTime()
      )
    requests = await enrichWithEmployees(requests)
    return NextResponse.json(requests)
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
    .collection('travelRequests')
    .where('employeeId', '==', targetUid)
    .limit(100)
    .get()
  let requests = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.appliedAt || b.createdAt || 0).getTime() -
        new Date(a.appliedAt || a.createdAt || 0).getTime()
    )

  requests = await enrichWithEmployees(requests)
  return NextResponse.json(requests)
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
// POST /api/travel
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
        { error: 'Cannot submit travel requests for another employee' },
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
  const ref = await adminDb.collection('travelRequests').add({
    ...body,
    employeeId,
    status: 'PENDING',
    appliedAt: now,
    createdAt: now,
    updatedAt: now,
  })

  // Notify manager
  const empDoc = await adminDb.collection('users').doc(employeeId).get()
  if (empDoc.exists && empDoc.data()?.managerId) {
    await createNotification(
      empDoc.data()!.managerId,
      'New travel request',
      `${empDoc.data()!.name} requested travel to ${body.destination || ''}`,
      'INFO'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'TRAVEL',
    ref.id,
    `Submitted travel request to ${body.destination || ''}${employeeId !== ctx.uid ? ` on behalf of ${employeeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// ============================================================
// PATCH /api/travel
// Authenticated.
// - APPROVE/REJECT: managers+ only. MANAGER role must be employee's direct manager.
//   approverId derived from verified token.
// - CANCEL: self or manager+.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id, status, note } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const travelRef = adminDb.collection('travelRequests').doc(id)
  const travelDoc = await travelRef.get()
  if (!travelDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const trData: any = travelDoc.data()
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const isSelf = trData.employeeId === ctx.uid

  const isApproval = ['APPROVED', 'REJECTED'].includes(status)

  if (isApproval) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Only managers can approve/reject travel' },
        { status: 403 }
      )
    }
    if (ctx.role === 'MANAGER') {
      const empDoc = await adminDb.collection('users').doc(trData.employeeId).get()
      const empData: any = empDoc.exists ? empDoc.data() : {}
      if (empData.managerId && empData.managerId !== ctx.uid) {
        return NextResponse.json(
          { error: 'Employee is not in your team' },
          { status: 403 }
        )
      }
    }
  } else if (status === 'CANCELLED') {
    if (!isSelf && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // approverId derived from token (canonical) for approval actions
  const approverId = isApproval ? ctx.uid : null

  await travelRef.update({
    status,
    approverId,
    approverNote: note || '',
    decidedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // Notify employee
  await createNotification(
    trData.employeeId,
    `Travel ${status.toLowerCase()}`,
    `Your travel request has been ${status.toLowerCase()}.${note ? ' Note: ' + note : ''}`,
    'INFO'
  )

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    status,
    'TRAVEL',
    id,
    `Travel ${id} → ${status}`
  )

  const doc = await travelRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
