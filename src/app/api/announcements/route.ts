import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/announcements
// Authenticated. Any authenticated user can read announcements.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const snap = await adminDb
    .collection('announcements')
    .orderBy('publishedAt', 'desc')
    .limit(30)
    .get()
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json(items)
}

// ============================================================
// POST /api/announcements
// Authenticated. Managers+/HR/Admin only.
// authorId derived from verified token (canonical).
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'MANAGER')) {
    return NextResponse.json(
      { error: 'Only managers/HR can publish announcements' },
      { status: 403 }
    )
  }

  const { title, content, category, priority } = await req.json()
  if (!title || !content) {
    return NextResponse.json(
      { error: 'title and content required' },
      { status: 400 }
    )
  }

  // Canonical authorId/authorName — derived from verified token
  const authorId = ctx.uid
  const authorName = ctx.name || ctx.email

  const now = new Date().toISOString()
  const ref = await adminDb.collection('announcements').add({
    title,
    content,
    category: category || 'GENERAL',
    priority: priority || 'MEDIUM',
    authorId,
    authorName,
    publishedAt: now,
    createdAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'ANNOUNCEMENT',
    ref.id,
    `Published announcement "${title}"`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
