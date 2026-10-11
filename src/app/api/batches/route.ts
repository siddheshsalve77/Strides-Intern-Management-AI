import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/batches
// Authenticated. Managers+/HR/Admin can list batches.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'MANAGER')) {
    return NextResponse.json(
      { error: 'Only managers/HR can view batches' },
      { status: 403 }
    )
  }

  const snap = await adminDb.collection('batches').get()
  const batches = []
  for (const doc of snap.docs) {
    const b = { id: doc.id, ...doc.data() }
    const interns = await adminDb.collection('users').where('batchId', '==', doc.id).get()
    const internIds = interns.docs.map((d) => d.id).slice(0, 10)
    const goalsSnap = internIds.length > 0
      ? await adminDb.collection('goals').where('employeeId', 'in', internIds).get().catch(() => ({ docs: [] }))
      : { docs: [] }
    const reviewsSnap = internIds.length > 0
      ? await adminDb.collection('reviewRequests').where('employeeId', 'in', internIds).get().catch(() => ({ docs: [] }))
      : { docs: [] }
    const avgProgress = goalsSnap.docs.length > 0
      ? Math.round(
          goalsSnap.docs.reduce((s, d) => s + (d.data().progress || 0), 0) /
            goalsSnap.docs.length
        )
      : 0
    const pendingReviews = reviewsSnap.docs.filter((d) =>
      ['PENDING', 'SCHEDULED'].includes(d.data().status)
    ).length
    batches.push({
      ...b,
      startDate: b.startDate,
      endDate: b.endDate,
      createdAt: b.createdAt,
      internCount: interns.size,
      avgProgress,
      pendingReviews,
      manager: b.managerId ? { id: b.managerId } : null,
    })
  }
  return NextResponse.json(batches)
}

// ============================================================
// POST /api/batches
// Authenticated. HR/Admin only.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'HR')) {
    return NextResponse.json(
      { error: 'Only HR/Admin can create batches' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { name, program, department, startDate, endDate, capacity, managerId, mentorIds } = body
  if (!name || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Name, start date, and end date required' },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('batches').add({
    name,
    program: program || 'Software Internship',
    department: department || 'Engineering',
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    capacity: capacity || 20,
    managerId: managerId || null,
    mentorIds: mentorIds || [],
    status: 'ACTIVE',
    createdAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'BATCH',
    ref.id,
    `Created batch "${name}"`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
