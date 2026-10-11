import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/leave/balance
// Authenticated. Non-managers can only see their own balance.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// Backward compat: ?employeeId=me alias for ctx.uid.
// Auto-creates default balance (12/12/15) if missing.
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
    targetUid = requestedEmployeeId
  }

  // For manager+ requesting another employee's balance, verify team membership (MANAGER only)
  if (ctx.role === 'MANAGER' && targetUid !== ctx.uid) {
    const empDoc = await adminDb.collection('users').doc(targetUid).get()
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

  const snap = await adminDb
    .collection('leaveBalances')
    .where('employeeId', '==', targetUid)
    .limit(1)
    .get()

  if (snap.empty) {
    // Auto-create default balance if none exists
    const now = new Date().toISOString()
    const ref = await adminDb.collection('leaveBalances').add({
      employeeId: targetUid,
      casualLeave: 12,
      sickLeave: 12,
      earnedLeave: 15,
      year: new Date().getFullYear(),
      createdAt: now,
      updatedAt: now,
    })
    const doc = await ref.get()
    return NextResponse.json({ id: doc.id, ...doc.data() })
  }

  const doc = snap.docs[0]
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
