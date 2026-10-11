import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// PATCH /api/batches/[id]
// Authenticated. HR/Admin only.
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'HR')) {
    return NextResponse.json(
      { error: 'Only HR/Admin can update batches' },
      { status: 403 }
    )
  }

  const { id } = await params
  const body = await req.json()
  const data: any = { updatedAt: new Date().toISOString() }
  for (const k of [
    'name',
    'program',
    'department',
    'startDate',
    'endDate',
    'capacity',
    'managerId',
    'status',
  ]) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const batchRef = adminDb.collection('batches').doc(id)
  await batchRef.update(data)

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'BATCH',
    id,
    `Updated batch ${id}`
  )

  const doc = await batchRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
