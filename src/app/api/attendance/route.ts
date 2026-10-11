import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/attendance
// Authenticated.
// - Employees/interns: only their own attendance. ?employeeId is IGNORED (derives from token).
// - Managers/HR/Admin: can pass ?employeeId=<uid> to view a specific employee, or omit for their own.
//   - Managers additionally accept ?scope=team to view their team's attendance.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '60')
  const requestedEmployeeId = searchParams.get('employeeId')
  const scope = searchParams.get('scope')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Resolve the target UID for "self" queries
  let targetUid: string
  if (!requestedEmployeeId || requestedEmployeeId === 'me') {
    targetUid = ctx.uid
  } else {
    // Non-managers cannot query another employee's attendance
    if (!isManager && requestedEmployeeId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    targetUid = requestedEmployeeId
  }

  // Team scope (managers only)
  if (scope === 'team' && isManager) {
    const reporteesSnap = await adminDb
      .collection('users')
      .where('managerId', '==', ctx.uid)
      .get()
    const teamUids = [ctx.uid, ...reporteesSnap.docs.map((d) => d.id)]
    // For each team member, fetch their attendance — multiple where queries
    const all = await Promise.all(
      teamUids.slice(0, 30).map(async (uid) => {
        const snap = await adminDb
          .collection('attendance')
          .where('employeeId', '==', uid)
          .limit(60)
          .get()
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      })
    )
    const records = all.flat()
    records.sort(
      (a: any, b: any) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    )
    return NextResponse.json(records.slice(0, limit))
  }

  const snap = await adminDb
    .collection('attendance')
    .where('employeeId', '==', targetUid)
    .limit(limit)
    .get()
  const records = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  return NextResponse.json(records)
}

// ============================================================
// POST /api/attendance
// Authenticated. The employeeId for check-in/out is ALWAYS derived from the verified token.
// ?employeeId in the body is IGNORED for non-managers (prevents IDOR).
// Managers can pass ?action=CHECK_IN&employeeId=<uid> to check in ON BEHALF of a reportee (e.g., remote approval).
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const action = body.action
  if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const isManager = hasMinRole(ctx.role, 'MANAGER')
  // Canonical employeeId — derived from token, NOT client body
  let employeeId = ctx.uid
  if (body.employeeId && body.employeeId !== ctx.uid) {
    // Only managers can perform actions on behalf of their reportees
    if (!isManager) {
      return NextResponse.json({ error: 'Cannot perform actions for another employee' }, { status: 403 })
    }
    const empDoc = await adminDb.collection('users').doc(body.employeeId).get()
    if (!empDoc.exists) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 400 })
    }
    const empData: any = empDoc.data()
    if (empData.managerId && empData.managerId !== ctx.uid && !hasMinRole(ctx.role, 'HR')) {
      return NextResponse.json({ error: 'Employee is not in your team' }, { status: 403 })
    }
    employeeId = body.employeeId
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find today's record (client-side filter to avoid composite index)
  const snap = await adminDb
    .collection('attendance')
    .where('employeeId', '==', employeeId)
    .limit(100)
    .get()
  const todayRecord = snap.docs.find((d) => {
    const data = d.data()
    return data.date && new Date(data.date).toDateString() === today.toDateString()
  })

  if (action === 'CHECK_IN') {
    if (todayRecord && todayRecord.data().checkIn) {
      return NextResponse.json({ error: 'Already checked in' }, { status: 400 })
    }
    const now = new Date()
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 45)
    const data: any = {
      employeeId,
      date: today.toISOString(),
      checkIn: now.toISOString(),
      status: isLate ? 'LATE' : 'PRESENT',
      workHours: 0,
      breakMinutes: 45,
    }
    if (todayRecord) {
      await todayRecord.ref.update(data)
      await createAuditLog(ctx.uid, ctx.name || ctx.email, 'CHECK_IN', 'ATTENDANCE', todayRecord.id, `Checked in ${employeeId === ctx.uid ? 'self' : employeeId}`)
      return NextResponse.json({ id: todayRecord.id, ...data })
    } else {
      const ref = await adminDb.collection('attendance').add(data)
      await createAuditLog(ctx.uid, ctx.name || ctx.email, 'CHECK_IN', 'ATTENDANCE', ref.id, `Checked in ${employeeId === ctx.uid ? 'self' : employeeId}`)
      return NextResponse.json({ id: ref.id, ...data })
    }
  }

  if (action === 'CHECK_OUT') {
    if (!todayRecord) {
      return NextResponse.json({ error: 'Must check in first' }, { status: 400 })
    }
    const existing = todayRecord.data()
    const checkIn = existing.checkIn ? new Date(existing.checkIn) : null
    if (!checkIn) {
      return NextResponse.json({ error: 'No check-in found' }, { status: 400 })
    }
    const now = new Date()
    const hours = (now.getTime() - checkIn.getTime()) / 3600000
    await todayRecord.ref.update({
      checkOut: now.toISOString(),
      workHours: Math.round(hours * 100) / 100,
      breakMinutes: 45,
    })
    await createAuditLog(ctx.uid, ctx.name || ctx.email, 'CHECK_OUT', 'ATTENDANCE', todayRecord.id, `Checked out ${employeeId === ctx.uid ? 'self' : employeeId}`)
    return NextResponse.json({
      id: todayRecord.id,
      ...existing,
      checkOut: now.toISOString(),
      workHours: Math.round(hours * 100) / 100,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
