import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/projects
// Authenticated. Any authenticated user can browse projects.
// ?employeeId filter — list projects where the employee is a member.
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')

  let targetUid: string | null = null
  if (requestedEmployeeId) {
    if (requestedEmployeeId === 'me' || requestedEmployeeId === ctx.uid) {
      targetUid = ctx.uid
    } else {
      // Allow managers+ to query another employee's projects; non-managers forbidden
      if (!hasMinRole(ctx.role, 'MANAGER')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      targetUid = requestedEmployeeId
    }
  }

  if (targetUid) {
    // Get projects where employee is a member
    const pmSnap = await adminDb
      .collection('projectMembers')
      .where('employeeId', '==', targetUid)
      .get()
    const projectIds = pmSnap.docs
      .map((d) => d.data().projectId)
      .filter(Boolean)
    if (projectIds.length === 0) return NextResponse.json([])
    const chunks: string[][] = []
    for (let i = 0; i < projectIds.length; i += 10) {
      chunks.push(projectIds.slice(i, i + 10))
    }
    const results: any[] = []
    for (const chunk of chunks) {
      const snap = await adminDb
        .collection('projects')
        .where('__name__', 'in', chunk)
        .get()
      results.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }
    return NextResponse.json(results)
  }

  const snap = await adminDb.collection('projects').limit(50).get()
  return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
}

// ============================================================
// POST /api/projects
// Authenticated. Managers+/HR/Admin only.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'MANAGER')) {
    return NextResponse.json(
      { error: 'Only managers/HR can create projects' },
      { status: 403 }
    )
  }

  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('projects').add({
    ...body,
    status: body.status || 'ACTIVE',
    priority: body.priority || 'MEDIUM',
    progress: 0,
    startDate: now,
    createdById: ctx.uid,
    createdAt: now,
    updatedAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'PROJECT',
    ref.id,
    `Created project "${body.name}"`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
