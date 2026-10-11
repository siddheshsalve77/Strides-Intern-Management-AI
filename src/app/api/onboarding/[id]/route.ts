import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// PATCH /api/onboarding/[id]
// Authenticated. Marks a task complete/incomplete.
// - Owner (employeeId === ctx.uid) can toggle own task.
// - Managers+ can toggle tasks for their reportees.
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  const { completed } = await req.json()

  const taskRef = adminDb.collection('onboardingTasks').doc(id)
  const taskDoc = await taskRef.get()
  if (!taskDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const taskData: any = taskDoc.data()
  const isSelf = taskData.employeeId === ctx.uid
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  if (!isSelf && !isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isSelf && ctx.role === 'MANAGER') {
    const empDoc = await adminDb.collection('users').doc(taskData.employeeId).get()
    const empData: any = empDoc.exists ? empDoc.data() : {}
    if (empData.managerId && empData.managerId !== ctx.uid) {
      return NextResponse.json(
        { error: 'Employee is not in your team' },
        { status: 403 }
      )
    }
  }

  await taskRef.update({
    completed,
    completedAt: completed ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  })

  if (completed) {
    const allSnap = await adminDb
      .collection('onboardingTasks')
      .where('employeeId', '==', taskData.employeeId)
      .get()
    const allDone = allSnap.docs.every((d) => d.data().completed)
    if (allDone) {
      const empDoc = await adminDb.collection('users').doc(taskData.employeeId).get()
      if (empDoc.exists && empDoc.data()?.managerId) {
        await createNotification(
          empDoc.data()!.managerId,
          'Onboarding complete',
          `${empDoc.data()!.name} completed all onboarding tasks`,
          'INFO'
        )
      }
    }
    await createNotification(
      taskData.employeeId,
      'Onboarding step completed',
      `"${taskData.title}" marked as complete`,
      'INFO'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'ONBOARDING',
    id,
    `Onboarding task ${id} → ${completed ? 'completed' : 'incomplete'}`
  )

  const updated = await taskRef.get()
  return NextResponse.json({ id: updated.id, ...updated.data() })
}
