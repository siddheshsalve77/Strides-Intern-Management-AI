import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

function serialize(d: any) {
  return { id: d.id, ...d.data() }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doc = await adminDb.collection('users').doc(id).get()
  if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const data = doc.data()!
  // Get manager
  let manager = null
  if (data.managerId) {
    const mgrDoc = await adminDb.collection('users').doc(data.managerId).get()
    if (mgrDoc.exists) manager = { uid: mgrDoc.id, ...mgrDoc.data() }
  }
  // Get reports count
  const reportsSnap = await adminDb.collection('users').where('managerId', '==', id).get()
  return NextResponse.json({
    uid: doc.id,
    ...data,
    manager,
    reportsCount: reportsSnap.size,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const allowedFields = ['phone', 'photoUrl', 'skills', 'emergencyContact', 'emergencyPhone', 'careerGoals']
  const data: any = {}
  for (const f of allowedFields) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  data.updatedAt = new Date().toISOString()
  await adminDb.collection('users').doc(id).update(data)
  const doc = await adminDb.collection('users').doc(id).get()
  return NextResponse.json({ uid: doc.id, ...doc.data() })
}
