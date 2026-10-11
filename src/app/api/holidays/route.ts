import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth } from '@/lib/api-auth'

// ============================================================
// GET /api/holidays
// Authenticated. Any authenticated user can read the holiday list.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const upcoming = searchParams.get('upcoming')

  let q: any = adminDb.collection('holidays')
  if (upcoming) {
    q = q.where('date', '>=', new Date().toISOString())
  }
  const snap = await q.orderBy('date', 'asc').get()
  const holidays = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json(holidays)
}
