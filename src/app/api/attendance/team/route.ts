import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { serializeEmployee } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const managerId = searchParams.get('managerId')
  if (!managerId) return NextResponse.json({ error: 'managerId required' }, { status: 400 })

  const teamSnap = await adminDb.collection('users').where('managerId', '==', managerId).get()
  const teamIds = teamSnap.docs.map(d => d.id)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const result = []
  for (const doc of teamSnap.docs) {
    const emp = { employee: serializeEmployee({ id: doc.id, ...doc.data() } as any), attendance: null }
    const attSnap = await adminDb.collection('attendance').where('employeeId', '==', doc.id).limit(100).get()
    const todayRec = attSnap.docs.find(d => { const a = d.data(); return a.date && new Date(a.date).toDateString() === today.toDateString() })
    if (todayRec) {
      emp.attendance = { id: todayRec.id, ...todayRec.data() }
    }
    result.push(emp)
  }
  return NextResponse.json(result)
}
