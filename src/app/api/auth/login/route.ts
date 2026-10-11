import { NextResponse } from 'next/server'

// This route is deprecated — authentication is now handled by Firebase Auth.
// The client uses signInWithEmailAndPassword() directly via the Firebase SDK.
export async function POST() {
  return NextResponse.json(
    { error: 'Authentication is handled by Firebase Auth. Use the Firebase client SDK to sign in.' },
    { status: 410 }
  )
}
