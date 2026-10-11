import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/expenses
// Authenticated. Non-managers see only their own expenses.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// ?scope=team — managers see their team's expenses.
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
          .collection('expenses')
          .where('employeeId', '==', uid)
          .limit(50)
          .get()
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      })
    )
    let expenses = all
      .flat()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    expenses = await enrichWithEmployees(expenses)
    return NextResponse.json(expenses)
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
    .collection('expenses')
    .where('employeeId', '==', targetUid)
    .limit(100)
    .get()
  let expenses = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )

  expenses = await enrichWithEmployees(expenses)
  return NextResponse.json(expenses)
}

async function enrichWithEmployees(items: any[]) {
  const empIds = [...new Set(items.map((e: any) => e.employeeId).filter(Boolean))]
  const employees = await Promise.all(
    empIds.map(async (id) => {
      const d = await adminDb.collection('users').doc(id).get()
      return d.exists ? { uid: d.id, ...d.data() } : null
    })
  )
  const empMap = new Map(
    employees.filter(Boolean).map((e: any) => [e.uid || e.id, e])
  )
  return items.map((e: any) => ({
    ...e,
    employee: empMap.get(e.employeeId) || undefined,
  }))
}

// ============================================================
// POST /api/expenses
// Authenticated. employeeId derived from verified token (canonical).
// Managers+ can submit on behalf of reportees via body.employeeId.
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
        { error: 'Cannot submit expenses for another employee' },
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
  const ref = await adminDb.collection('expenses').add({
    title: body.title || '',
    description: body.description || '',
    category: body.category || 'GENERAL',
    employeeId,
    amount: parseFloat(body.amount) || 0,
    status: 'PENDING',
    date: body.date ? new Date(body.date).toISOString() : now,
    createdAt: now,
    updatedAt: now,
  })

  // Notify manager of the employee
  const empDoc = await adminDb.collection('users').doc(employeeId).get()
  if (empDoc.exists && empDoc.data()?.managerId) {
    await createNotification(
      empDoc.data()!.managerId,
      'New expense submitted',
      `${empDoc.data()!.name} submitted an expense of ${body.amount}`,
      'INFO'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'EXPENSE',
    ref.id,
    `Submitted expense ${body.amount}${employeeId !== ctx.uid ? ` on behalf of ${employeeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// ============================================================
// PATCH /api/expenses
// Authenticated.
// - APPROVE/REJECT (status changes): managers+ only. MANAGER role must be employee's direct manager.
// - CANCEL: self or manager+.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const expenseRef = adminDb.collection('expenses').doc(id)
  const expenseDoc = await expenseRef.get()
  if (!expenseDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const expData: any = expenseDoc.data()
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const isSelf = expData.employeeId === ctx.uid

  // Status that indicates approval-style action
  const isApproval = [
    'MANAGER_APPROVED',
    'FINANCE_APPROVED',
    'PROCESSED',
    'REJECTED',
  ].includes(status)

  if (isApproval) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Only managers can change expense status' },
        { status: 403 }
      )
    }
    if (ctx.role === 'MANAGER') {
      const empDoc = await adminDb.collection('users').doc(expData.employeeId).get()
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

  await expenseRef.update({
    status,
    updatedAt: new Date().toISOString(),
  })

  // Notify employee on status change
  await createNotification(
    expData.employeeId,
    'Expense updated',
    `Your expense "${expData.title || ''}" is now ${status}`,
    'INFO'
  )

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'EXPENSE',
    id,
    `Expense ${id} → ${status}`
  )

  const doc = await expenseRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
