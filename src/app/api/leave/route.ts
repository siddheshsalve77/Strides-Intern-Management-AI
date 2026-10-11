import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

function serialize(d: any) {
  return { id: d.id, ...d.data() }
}

// ============================================================
// GET /api/leave
// Authenticated. Non-managers see only their own leave requests.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// ?scope=team — managers see their team's leave.
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
          .collection('leaveRequests')
          .where('employeeId', '==', uid)
          .limit(50)
          .get()
        return snap.docs.map((d) => serialize(d))
      })
    )
    let leaves = all.flat().sort(
      (a: any, b: any) =>
        new Date(b.appliedAt || b.createdAt || 0).getTime() -
        new Date(a.appliedAt || a.createdAt || 0).getTime()
    )
    leaves = await enrichWithEmployees(leaves)
    return NextResponse.json(leaves)
  }

  // Resolve target UID
  let targetUid: string
  if (!requestedEmployeeId || requestedEmployeeId === 'me') {
    targetUid = ctx.uid
  } else {
    if (!isManager && requestedEmployeeId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    targetUid = requestedEmployeeId
  }

  const snap = await adminDb
    .collection('leaveRequests')
    .where('employeeId', '==', targetUid)
    .limit(100)
    .get()
  let leaves = snap.docs
    .map((d) => serialize(d))
    .sort(
      (a: any, b: any) =>
        new Date(b.appliedAt || b.createdAt || 0).getTime() -
        new Date(a.appliedAt || a.createdAt || 0).getTime()
    )

  leaves = await enrichWithEmployees(leaves)
  return NextResponse.json(leaves)
}

async function enrichWithEmployees(items: any[]) {
  const empIds = [...new Set(items.map((l: any) => l.employeeId).filter(Boolean))]
  const employees = await Promise.all(
    empIds.map(async (id) => {
      const doc = await adminDb.collection('users').doc(id).get()
      return doc.exists ? { uid: doc.id, ...doc.data() } : null
    })
  )
  const empMap = new Map(
    employees.filter(Boolean).map((e: any) => [e.uid, e])
  )
  return items.map((l: any) => ({
    ...l,
    employee: empMap.get(l.employeeId) || undefined,
  }))
}

// ============================================================
// POST /api/leave
// Authenticated. employeeId derived from verified token (canonical).
// Managers+ can submit on behalf of reportees (via body.employeeId).
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const { leaveType, fromDate, toDate, days, reason } = body
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Canonical employeeId — derived from token, NOT client body
  let employeeId = ctx.uid
  if (body.employeeId && body.employeeId !== ctx.uid) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Cannot submit leave for another employee' },
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

  if (!fromDate || !toDate || !days) {
    return NextResponse.json(
      { error: 'fromDate, toDate, days required' },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('leaveRequests').add({
    employeeId,
    leaveType: leaveType || 'CASUAL',
    fromDate,
    toDate,
    days: parseFloat(days),
    reason: reason || '',
    status: 'PENDING',
    approverId: null,
    approverNote: '',
    appliedAt: now,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
  })

  // Notify manager
  const empDoc = await adminDb.collection('users').doc(employeeId).get()
  if (empDoc.exists && empDoc.data()?.managerId) {
    await createNotification(
      empDoc.data()!.managerId,
      'New leave request',
      `${empDoc.data()!.name} requested ${days} day(s) ${leaveType?.toLowerCase()} leave`,
      'LEAVE'
    )
  }
  // Notify employee
  await createNotification(
    employeeId,
    'Leave request submitted',
    `Your ${leaveType?.toLowerCase()} leave for ${days} day(s) is pending approval`,
    'LEAVE'
  )

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'LEAVE',
    ref.id,
    `Submitted ${days} day(s) ${leaveType || 'casual'} leave${employeeId !== ctx.uid ? ` on behalf of ${employeeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json(serialize(doc))
}

// ============================================================
// PATCH /api/leave
// Authenticated.
// - APPROVE/REJECT: managers+ only. MANAGER role must be the employee's direct manager.
//   approverId is derived from the verified token (canonical).
// - CANCEL: self-cancellation OR manager+ override.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id, action, note } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const status =
    action === 'APPROVE'
      ? 'APPROVED'
      : action === 'REJECT'
      ? 'REJECTED'
      : 'CANCELLED'

  const leaveRef = adminDb.collection('leaveRequests').doc(id)
  const leaveDoc = await leaveRef.get()
  if (!leaveDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const leaveData: any = leaveDoc.data()
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const isSelf = leaveData.employeeId === ctx.uid

  // APPROVE/REJECT require manager+
  if (action === 'APPROVE' || action === 'REJECT') {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Only managers can approve/reject leave' },
        { status: 403 }
      )
    }
    // MANAGER (not HR/Admin) must be the employee's direct manager
    if (ctx.role === 'MANAGER') {
      const empDoc = await adminDb.collection('users').doc(leaveData.employeeId).get()
      const empData: any = empDoc.exists ? empDoc.data() : {}
      if (empData.managerId && empData.managerId !== ctx.uid) {
        return NextResponse.json(
          { error: "You are not this employee's manager" },
          { status: 403 }
        )
      }
    }
  }

  // CANCEL — self or manager+
  if (action === 'CANCEL' || status === 'CANCELLED') {
    if (!isSelf && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // approverId derived from token (canonical)
  const approverId =
    action === 'APPROVE' || action === 'REJECT' ? ctx.uid : null

  await leaveRef.update({
    status,
    approverId,
    approverNote: note || '',
    decidedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // Deduct balance on approval
  if (status === 'APPROVED') {
    const balSnap = await adminDb
      .collection('leaveBalances')
      .where('employeeId', '==', leaveData.employeeId)
      .limit(1)
      .get()
    if (!balSnap.empty) {
      const balRef = balSnap.docs[0].ref
      const bal = balSnap.docs[0].data()
      const field =
        leaveData.leaveType === 'CASUAL'
          ? 'casualLeave'
          : leaveData.leaveType === 'SICK'
          ? 'sickLeave'
          : 'earnedLeave'
      await balRef.update({
        [field]: Math.max(0, (bal[field] || 0) - leaveData.days),
      })
    }
    await createNotification(
      leaveData.employeeId,
      `Leave ${status.toLowerCase()}`,
      `Your ${leaveData.leaveType?.toLowerCase()} leave request has been ${status.toLowerCase()}.${note ? ' Note: ' + note : ''}`,
      'LEAVE'
    )
  } else if (status === 'CANCELLED' || status === 'REJECTED') {
    await createNotification(
      leaveData.employeeId,
      `Leave ${status.toLowerCase()}`,
      `Your ${leaveData.leaveType?.toLowerCase()} leave request has been ${status.toLowerCase()}.${note ? ' Note: ' + note : ''}`,
      'LEAVE'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    action || status,
    'LEAVE',
    id,
    `Leave ${id} → ${status}`
  )

  const doc = await leaveRef.get()
  return NextResponse.json(serialize(doc))
}
