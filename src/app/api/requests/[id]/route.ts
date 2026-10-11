import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// PATCH /api/requests/[id]
// Authenticated.
// - Owner can update priority/subject (self-service) on own request.
// - Managers+/HR/Admin can update status/assignment/resolution.
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  const { status, assignedTo, resolution, priority } = await req.json()

  const reqRef = adminDb.collection('hrRequests').doc(id)
  const reqDoc = await reqRef.get()
  if (!reqDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const reqData: any = reqDoc.data()
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const isSelf = reqData.employeeId === ctx.uid

  // Status/assignment/resolution changes require manager+
  if (
    status !== undefined ||
    assignedTo !== undefined ||
    resolution !== undefined
  ) {
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
