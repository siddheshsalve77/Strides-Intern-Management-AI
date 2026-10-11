import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// GET /api/notifications
// Authenticated. Returns notifications for the current user.
// Non-managers: ignores ?employeeId (always uses their UID).
// Managers/HR/Admin: can request ?employeeId=<uid> to view another's notifications.
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

  const snap = await adminDb
    .collection('notifications')
    .where('employeeId', '==', targetUid)
    .limit(100)
    .get()
  const notifs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 50)
  return NextResponse.json(notifs)
}

// POST /api/notifications — internal use only (managers/HR/Admin can send a notification to a user)
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  if (!hasMinRole(ctx.role, 'MANAGER')) {
    return NextResponse.json({ error: 'Only managers can send notifications' }, { status: 403 })
  }
  const { employeeId, title, message, type, link } = await req.json()
  if (!employeeId || !title) return NextResponse.json({ error: 'employeeId and title required' }, { status: 400 })

  const ref = await adminDb.collection('notifications').add({
    employeeId, title, message: message || '', type: type || 'INFO', link: link || '', read: false,
    createdAt: new Date().toISOString(),
  })
  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// PATCH /api/notifications — mark read (uses authenticated UID; never trusts client body for ownership)
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { action, id } = await req.json()

  if (action === 'READ_ALL') {
    const snap = await adminDb
      .collection('notifications')
      .where('employeeId', '==', ctx.uid)
      .where('read', '==', false)
      .get()
    const batch = adminDb.batch()
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }))
    await batch.commit()
    return NextResponse.json({ ok: true })
  }
  if (action === 'READ' && id) {
    // Verify ownership before marking read
    const doc = await adminDb.collection('notifications').doc(id).get()
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const data: any = doc.data()
    if (data.employeeId !== ctx.uid && !hasMinRole(ctx.role, 'HR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await doc.ref.update({ read: true })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}
