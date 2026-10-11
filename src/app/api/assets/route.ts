import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/assets
// Authenticated. Any authenticated user can browse assets.
// ?employeeId filter: non-managers only get assets assigned to them;
// managers+ can filter by ?employeeId=<uid> for reportees (HR/Admin for anyone).
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  let q: any = adminDb.collection('assets')

  if (requestedEmployeeId) {
    let targetUid: string
    if (requestedEmployeeId === 'me' || requestedEmployeeId === ctx.uid) {
      targetUid = ctx.uid
    } else if (isManager) {
      targetUid = requestedEmployeeId
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    q = q.where('employeeId', '==', targetUid)
  }

  const snap = await q.get()
  const assets = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.issuedAt || b.createdAt || 0).getTime() -
        new Date(a.issuedAt || a.createdAt || 0).getTime()
    )

  return NextResponse.json(assets)
}

// ============================================================
// POST /api/assets
// Authenticated. HR/Admin only.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'HR')) {
    return NextResponse.json(
      { error: 'Only HR/Admin can create assets' },
      { status: 403 }
    )
  }

  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('assets').add({
    ...body,
    issuedAt: body.issuedAt || now,
    createdAt: now,
    updatedAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'ASSET',
    ref.id,
    `Created asset "${body.name}"`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// ============================================================
// PATCH /api/assets
// Authenticated. HR/Admin only (status/assignment changes).
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'HR')) {
    return NextResponse.json(
      { error: 'Only HR/Admin can update assets' },
      { status: 403 }
    )
  }

  const { id, ...rest } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: any = { ...rest, updatedAt: new Date().toISOString() }
  delete data.id

  const assetRef = adminDb.collection('assets').doc(id)
  await assetRef.update(data)

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'ASSET',
    id,
    `Updated asset ${id}`
  )

  const doc = await assetRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
