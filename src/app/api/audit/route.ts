import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/audit
// Authenticated. HR/Admin only.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'HR')) {
    return NextResponse.json(
      { error: 'Only HR/Admin can view audit logs' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const employeeId = searchParams.get('employeeId')

  let q: any = adminDb.collection('auditLogs')
  if (employeeId) q = q.where('employeeId', '==', employeeId)

  const snap = await q.limit(limit).get()
  const logs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
  return NextResponse.json(logs)
}
