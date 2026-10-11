import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth } from '@/lib/api-auth'

// ============================================================
// GET /api/directory
// Authenticated. Any authenticated user can browse the employee directory.
// Optional ?q= for name/designation/email search (client-side filter).
// Optional ?department= for department filter.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const department = searchParams.get('department')

  let query: any = adminDb.collection('users')
  if (department) query = query.where('department', '==', department)

  const snap = await query.limit(100).get()
  let employees = snap.docs.map((d) => ({ uid: d.id, ...d.data() }))

  // Client-side name search (Firestore doesn't support LIKE)
  if (q) {
    const lower = q.toLowerCase()
    employees = employees.filter(
      (e: any) =>
        (e.name || '').toLowerCase().includes(lower) ||
        (e.designation || '').toLowerCase().includes(lower) ||
        (e.employeeId || '').toLowerCase().includes(lower) ||
        (e.email || '').toLowerCase().includes(lower)
    )
  }

  return NextResponse.json(employees)
}
