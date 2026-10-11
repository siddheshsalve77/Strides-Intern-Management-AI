import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/departments
// Authenticated. Any authenticated user can read departments.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const snap = await adminDb.collection('departments').get()
  const depts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json(depts)
}

// ============================================================
// POST /api/departments
// Authenticated. HR/Admin only.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'HR')) {
    return NextResponse.json(
      { error: 'Only HR/Admin can create departments' },
      { status: 403 }
    )
  }

  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('departments').add({
    ...body,
    createdAt: now,
    updatedAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'DEPARTMENT',
    ref.id,
    `Created department "${body.name}"`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
