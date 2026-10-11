import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/onboarding
// Authenticated. Non-managers see only their own onboarding tasks.
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// ?scope=all — HR/Admin: group tasks by employee.
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const scope = searchParams.get('scope')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // HR/Admin scope=all — group by employee
  if (scope === 'all' && hasMinRole(ctx.role, 'HR')) {
    const snap = await adminDb.collection('onboardingTasks').limit(200).get()
    const tasks = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

    const empIds = [...new Set(tasks.map((t: any) => t.employeeId).filter(Boolean))]
    const employees = await Promise.all(
      empIds.map(async (id) => {
        const d = await adminDb.collection('users').doc(id).get()
        return d.exists ? { uid: d.id, ...d.data() } : null
      })
    )
    const empMap = new Map(
      employees.filter(Boolean).map((e: any) => [e.uid || e.id, e])
    )
    const map = new Map<string, any>()
    for (const t of tasks) {
      if (!map.has(t.employeeId)) {
        map.set(t.employeeId, {
          employee: empMap.get(t.employeeId),
          tasks: [],
          completed: 0,
          total: 0,
        })
      }
      const g = map.get(t.employeeId)
      g.tasks.push(t)
      g.total++
      if (t.completed) g.completed++
    }
    return NextResponse.json(Array.from(map.values()))
  }

  // Resolve target UID
  let targetUid: string
  if (!requestedEmployeeId || requestedEmployeeId === 'me') {
    targetUid = ctx.uid
  } else {
    if (!isManager && requestedEmployeeId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (ctx.role === 'MANAGER' && requestedEmployeeId !== ctx.uid) {
      const empDoc = await adminDb.collection('users').doc(requestedEmployeeId).get()
      if (!empDoc.exists) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
      const empData: any = empDoc.data()
      if (empData.managerId && empData.managerId !== ctx.uid) {
        return NextResponse.json(
          { error: 'Employee is not in your team' },
          { status: 403 }
        )
      }
    }
    targetUid = requestedEmployeeId
  }

  const snap = await adminDb
    .collection('onboardingTasks')
    .where('employeeId', '==', targetUid)
    .get()
  const tasks = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

  return NextResponse.json(tasks)
}

// ============================================================
// POST /api/onboarding
// Authenticated. HR/Admin or managers+ create onboarding tasks for their reportees.
// employeeId (target) must be specified by client (HR/manager context).
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const isManager = hasMinRole(ctx.role, 'MANAGER')
  if (!isManager) {
    return NextResponse.json(
      { error: 'Only managers/HR can create onboarding tasks' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { employeeId, title, category, description, dueDate } = body
  if (!employeeId || !title) {
    return NextResponse.json(
      { error: 'employeeId and title required' },
      { status: 400 }
    )
  }

  // Verify the target employee is in the manager's team (unless HR/Admin)
  if (ctx.role === 'MANAGER') {
    const empDoc = await adminDb.collection('users').doc(employeeId).get()
    if (!empDoc.exists) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 400 })
    }
    const empData: any = empDoc.data()
    if (empData.managerId && empData.managerId !== ctx.uid) {
      return NextResponse.json(
        { error: 'Employee is not in your team' },
        { status: 403 }
      )
    }
  }

  const count = (
    await adminDb
      .collection('onboardingTasks')
      .where('employeeId', '==', employeeId)
      .get()
  ).size
  const now = new Date().toISOString()
  const ref = await adminDb.collection('onboardingTasks').add({
    employeeId,
    title,
    category: category || 'GENERAL',
    description: description || '',
    order: count,
    completed: false,
    completedAt: null,
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    createdAt: now,
    updatedAt: now,
  })

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'ONBOARDING',
    ref.id,
    `Created onboarding task "${title}" for ${employeeId}`
  )

  // Notify the employee
  await createNotification(
    employeeId,
    'New onboarding task',
    `"${title}" has been added to your onboarding`,
    'INFO'
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

// ============================================================
// PATCH /api/onboarding  (id in body)
// Authenticated. Marks a task complete/incomplete.
// - Owner (employeeId === ctx.uid) can toggle own task.
// - Managers+ can toggle tasks for their reportees.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const { id, completed } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

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

  // Check if all tasks done → notify manager
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
          `${empDoc.data()!.name} has completed all onboarding tasks`,
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
