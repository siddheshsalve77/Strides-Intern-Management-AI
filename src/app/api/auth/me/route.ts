import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/firebase-admin'

// GET /api/auth/me — returns the authenticated user's Firestore profile
// Requires Authorization: Bearer <Firebase ID Token>
// Returns profile with `id` = `uid` for backward compatibility with client code
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (ctx.inactive) {
    return NextResponse.json({
      ...ctx,
      id: ctx.uid, // backward compat
      inactive: true,
      message: ctx.status === 'SUSPENDED'
        ? 'Your Strides One account has been suspended. Please contact HR.'
        : 'Your Strides One account is currently inactive. Please contact HR.',
    }, { status: 403 })
  }
  // Return with `id` = `uid` for backward compatibility with existing client code
  return NextResponse.json({ ...ctx, id: ctx.uid })
}
