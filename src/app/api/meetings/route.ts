import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/meetings
// Authenticated. Non-managers see only meetings where they are organizer/attendee.
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
    .collection('meeting')
    .orderBy('startTime', 'asc')
    .get()

  const meetings = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(
      (m: any) =>
        m.organizerId === targetUid ||
        (Array.isArray(m.attendeeIds) && m.attendeeIds.includes(targetUid))
    )
    .filter((m: any) => new Date(m.startTime) >= new Date(Date.now() - 86400000))
    .slice(0, 20)

  return NextResponse.json(meetings)
}

// ============================================================
// POST /api/meetings
// Authenticated. organizerId derived from verified token (canonical).
// Managers+ can schedule on behalf of reportees via body.organizerId.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Canonical organizerId — derived from token
  let organizerId = ctx.uid
  if (body.organizerId && body.organizerId !== ctx.uid) {
    if (!isManager) {
      return NextResponse.json(
        { error: 'Cannot schedule meetings for another employee' },
        { status: 403 }
      )
    }
    const empDoc = await adminDb.collection('users').doc(body.organizerId).get()
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
    organizerId = body.organizerId
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('meeting').add({
    ...body,
    organizerId,
    attendeeIds: body.attendeeIds || [],
    status: 'SCHEDULED',
    createdAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'MEETING',
    ref.id,
    `Scheduled meeting "${body.title || ''}"${organizerId !== ctx.uid ? ` on behalf of ${organizerId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// ============================================================
// PATCH /api/meetings
// Authenticated. Status changes — only organizer or manager+.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const meetingRef = adminDb.collection('meeting').doc(id)
  const meetingDoc = await meetingRef.get()
  if (!meetingDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const meetingData: any = meetingDoc.data()
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const isOrganizer = meetingData.organizerId === ctx.uid
  const isAttendee =
    Array.isArray(meetingData.attendeeIds) &&
    meetingData.attendeeIds.includes(ctx.uid)

  if (!isOrganizer && !isManager) {
    return NextResponse.json(
      { error: 'Only the organizer or a manager can update this meeting' },
      { status: 403 }
    )
  }

  await meetingRef.update({ status, updatedAt: new Date().toISOString() })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'MEETING',
    id,
    `Meeting ${id} → ${status}`
  )

  return NextResponse.json({ ok: true })
}
