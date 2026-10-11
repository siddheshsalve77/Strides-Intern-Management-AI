import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/learning
// Authenticated. Non-managers see only their own learning records.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

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
    .collection('learning')
    .where('employeeId', '==', targetUid)
    .get()
  const records = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )

  return NextResponse.json(records)
}

// ============================================================
// PATCH /api/learning
// Authenticated. Updates progress on a learning record.
// - Owner (employeeId === ctx.uid) can update own progress.
// - Managers+ can update learning for their reportees.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id, progress } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const learningRef = adminDb.collection('learning').doc(id)
  const learningDoc = await learningRef.get()
  if (!learningDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data2: any = learningDoc.data()
  const isSelf = data2.employeeId === ctx.uid
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  if (!isSelf && !isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isSelf && ctx.role === 'MANAGER') {
    const empDoc = await adminDb.collection('users').doc(data2.employeeId).get()
    const empData: any = empDoc.exists ? empDoc.data() : {}
    if (empData.managerId && empData.managerId !== ctx.uid) {
      return NextResponse.json(
        { error: 'Employee is not in your team' },
        { status: 403 }
      )
    }
  }

  const data: any = {
    progress: Math.max(0, Math.min(100, progress)),
    updatedAt: new Date().toISOString(),
  }
  if (progress >= 100) {
    data.status = 'COMPLETED'
    data.completedAt = new Date().toISOString()
  }
  await learningRef.update(data)

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'LEARNING',
    id,
    `Learning ${id} progress → ${progress}`
  )

  const doc = await learningRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
