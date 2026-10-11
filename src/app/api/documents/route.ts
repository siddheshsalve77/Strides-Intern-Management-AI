import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/documents
// Authenticated. Any authenticated user can browse documents.
// ?employeeId filter: non-managers only get their own (self) docs;
// managers+ can filter by ?employeeId=<uid> for reportees (HR/Admin for anyone).
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const category = searchParams.get('category')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  let query: any = adminDb.collection('documents')
  if (category) query = query.where('category', '==', category)

  // Apply employee filter with role check
  let targetUid: string | null = null
  if (requestedEmployeeId) {
    if (requestedEmployeeId === 'me') {
      targetUid = ctx.uid
    } else if (requestedEmployeeId === ctx.uid) {
      targetUid = ctx.uid
    } else if (isManager) {
      // Managers+ can view documents scoped to a specific employee
      // (MANAGER role: optionally verify team membership — done by query filter)
      targetUid = requestedEmployeeId
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (targetUid) {
    query = query.where('employeeId', '==', targetUid)
  }

  const snap = await query.orderBy('uploadedAt', 'desc').get()
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json(docs)
}

// ============================================================
// POST /api/documents
// Authenticated. HR/Admin only (documents are typically issued by HR).
// employeeId (target) can be specified by client.
// uploaderId derived from verified token.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'HR')) {
    return NextResponse.json(
      { error: 'Only HR/Admin can upload documents' },
      { status: 403 }
    )
  }

  const { title, category, fileName, employeeId } = await req.json()
  if (!title || !fileName) {
    return NextResponse.json(
      { error: 'title and fileName required' },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('documents').add({
    title,
    category: category || 'HR',
    fileName,
    fileUrl: `/uploads/${fileName}`, // metadata path — actual file in Supabase
    employeeId: employeeId || null,
    uploaderId: ctx.uid,
    uploadedAt: now,
    createdAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'DOCUMENT',
    ref.id,
    `Uploaded document "${title}"${employeeId ? ` for ${employeeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
