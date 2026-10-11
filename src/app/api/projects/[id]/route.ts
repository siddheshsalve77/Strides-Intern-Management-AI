import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth } from '@/lib/api-auth'

// ============================================================
// GET /api/projects/[id]
// Authenticated. Any authenticated user can fetch a project by ID.
// ============================================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  const doc = await adminDb.collection('projects').doc(id).get()
  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch members
  const membersSnap = await adminDb
    .collection('projectMembers')
    .where('projectId', '==', id)
    .get()
  const memberEmpIds = membersSnap.docs
    .map((d) => d.data().employeeId)
    .filter(Boolean)
  const employees = await Promise.all(
    memberEmpIds.map(async (empId) => {
      const eDoc = await adminDb.collection('users').doc(empId).get()
      return eDoc.exists ? { uid: eDoc.id, ...eDoc.data() } : null
    })
  )

  // Fetch tasks
  const tasksSnap = await adminDb
    .collection('tasks')
    .where('projectId', '==', id)
    .get()
  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return NextResponse.json({
    id: doc.id,
    ...doc.data(),
    members: membersSnap.docs
      .map((d, i) => ({
        id: d.id,
        role: d.data().role,
        employee: employees[i],
      }))
      .filter((m: any) => m.employee),
    tasks,
    startDate: doc.data()!.startDate,
    endDate: doc.data()!.endDate || null,
  })
}
