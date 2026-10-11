import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// PATCH /api/goals/[id]
// Authenticated.
// - Owner (employeeId === ctx.uid) can update progress/status on own goal.
// - Managers+ can update goals for their reportees.
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  const { progress, status } = await req.json()

  const goalRef = adminDb.collection('goals').doc(id)
  const goalDoc = await goalRef.get()
  if (!goalDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const goalData: any = goalDoc.data()
  const isSelf = goalData.employeeId === ctx.uid
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  if (!isSelf && !isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // MANAGER role must be the goal owner's direct manager (HR/Admin allowed)
  if (!isSelf && ctx.role === 'MANAGER') {
    const empDoc = await adminDb.collection('users').doc(goalData.employeeId).get()
    const empData: any = empDoc.exists ? empDoc.data() : {}
    if (empData.managerId && empData.managerId !== ctx.uid) {
      return NextResponse.json(
        { error: 'Employee is not in your team' },
        { status: 403 }
      )
    }
  }

  const data: any = { updatedAt: new Date().toISOString() }
  if (typeof progress === 'number') {
    data.progress = Math.max(0, Math.min(100, progress))
  }
  if (status) data.status = status
  await goalRef.update(data)

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'GOAL',
    id,
    `Updated goal ${id}${progress !== undefined ? ` progress=${progress}` : ''}${status ? ` status=${status}` : ''}`
  )

  const doc = await goalRef.get()
  return NextResponse.json({
    id: doc.id,
    ...doc.data(),
    deadline: doc.data()?.deadline || null,
  })
}
