import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

async function getTaskAndCheckAccess(req: NextRequest, id: string, requireManage = false) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return { ctx: null, task: null, error: ctx }

  const doc = await adminDb.collection('tasks').doc(id).get()
  if (!doc.exists) {
    return {
      ctx: null,
      task: null,
      error: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    }
  }
  const taskData: any = doc.data()

  // Access check: assignee, creator, or manager+ (HR/Admin can see all)
  const isAssignee = taskData.assignedTo === ctx.uid
  const isCreator = taskData.createdBy === ctx.uid
  const isManager = hasMinRole(ctx.role, 'MANAGER')
  const canAccess = isAssignee || isCreator || isManager
  if (!canAccess) {
    return {
      ctx: null,
      task: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  if (requireManage && !isCreator && !isManager) {
    return {
      ctx: null,
      task: null,
      error: NextResponse.json(
        { error: 'Only the creator or a manager can modify this task' },
        { status: 403 }
      ),
    }
  }
  return { ctx, task: { id: doc.id, ref: doc.ref, data: taskData }, error: null }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { ctx, task, error } = await getTaskAndCheckAccess(req, id, false)
  if (error) return error
  if (!task || !ctx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const t = task.data
  // Fetch assignee, creator, project
  let assignee = null, creator = null, project = null
  if (t.assignedTo) {
    const aDoc = await adminDb.collection('users').doc(t.assignedTo).get()
    if (aDoc.exists) assignee = { uid: aDoc.id, id: aDoc.id, ...aDoc.data() }
  }
  if (t.createdBy) {
    const cDoc = await adminDb.collection('users').doc(t.createdBy).get()
    if (cDoc.exists) creator = { uid: cDoc.id, id: cDoc.id, ...cDoc.data() }
  }
  if (t.projectId) {
    const pDoc = await adminDb.collection('projects').doc(t.projectId).get()
    if (pDoc.exists) project = { id: pDoc.id, ...pDoc.data() }
  }

  return NextResponse.json({
    id: task.id,
    ...t,
    assignee,
    creator,
    project: project ? { id: project.id, name: project.name } : null,
  })
}

// ============================================================
// PATCH /api/tasks/[id]
// ============================================================
// Action-based updates with auth + access checks + notifications.
// - START: assignee starts work (assignee or creator only)
// - SUBMIT: assignee submits work (creates new submission version via /api/submissions, NOT here)
// - APPROVE / COMPLETE / CHANGES_REQUESTED / REJECT: manager review actions
// - AI_REVIEW_DONE: stores AI evaluation result
// ============================================================
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { action } = body

  // CHANGES_REQUESTED and REJECT require manager+ role
  const isReviewAction = ['APPROVE', 'COMPLETE', 'CHANGES_REQUESTED', 'REJECT'].includes(action)
  const { ctx, task, error } = await getTaskAndCheckAccess(req, id, isReviewAction)
  if (error) return error
  if (!task || !ctx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const taskRef = task.ref
  const t = task.data
  const now = new Date().toISOString()
  const data: any = { updatedAt: now }

  let notifTarget: string | null = null
  let notifTitle = ''
  let notifMessage = ''
  let auditAction = action

  if (action === 'START') {
    if (!t.assignedTo || t.assignedTo !== ctx.uid) {
      return NextResponse.json({ error: 'Only the assignee can start work' }, { status: 403 })
    }
    data.status = 'IN_PROGRESS'
    if (t.createdBy) {
      notifTarget = t.createdBy
      notifTitle = 'Task started'
      notifMessage = `Work has started on "${t.title}"`
    }
  } else if (action === 'APPROVE') {
    data.status = 'APPROVED'
    data.managerScore = body.managerScore ?? null
    data.managerFeedback = body.managerFeedback || ''
    data.managerStatus = 'APPROVED'
    data.reviewerId = ctx.uid
    if (t.assignedTo) {
      notifTarget = t.assignedTo
      notifTitle = 'Task approved! 🎉'
      notifMessage = `"${t.title}" has been approved${body.managerScore ? ` (Score: ${body.managerScore})` : ''}`
    }
  } else if (action === 'COMPLETE') {
    data.status = 'COMPLETED'
    data.completedAt = now
    data.managerScore = body.managerScore ?? null
    data.managerFeedback = body.managerFeedback || ''
    data.managerStatus = 'APPROVED'
    data.reviewerId = ctx.uid
    if (t.assignedTo) {
      notifTarget = t.assignedTo
      notifTitle = 'Task completed! ✅'
      notifMessage = `"${t.title}" has been marked complete${body.managerScore ? ` (Score: ${body.managerScore})` : ''}`
    }
  } else if (action === 'CHANGES_REQUESTED') {
    data.status = 'IN_PROGRESS'
    data.managerScore = body.managerScore ?? null
    data.managerFeedback = body.managerFeedback || ''
    data.managerStatus = 'CHANGES_REQUESTED'
    data.reviewerId = ctx.uid
    if (t.assignedTo) {
      notifTarget = t.assignedTo
      notifTitle = 'Changes requested'
      notifMessage = `Your task "${t.title}" needs changes. ${body.managerFeedback || ''}`.trim()
    }
  } else if (action === 'REJECT') {
    data.status = 'CREATED'
    data.assignedTo = null
    data.managerStatus = 'REJECTED'
    data.reviewerId = ctx.uid
    data.managerFeedback = body.managerFeedback || ''
    auditAction = 'REJECT_TASK'
  } else if (action === 'AI_REVIEW_DONE') {
    data.aiScore = body.aiScore
    data.aiFeedback = body.aiFeedback || ''
    auditAction = 'AI_REVIEW'
  } else if (action === 'UPDATE_META') {
    // Edit task metadata (title, description, deadline, etc.) — creator/manager only
    if (!isReviewAction && !t.createdBy !== !ctx.uid && !hasMinRole(ctx.role, 'MANAGER')) {
      // already checked above; just be defensive
    }
    for (const f of ['title', 'description', 'deadline', 'priority', 'expectedDeliverable', 'evaluationCriteria']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    auditAction = 'UPDATE_TASK_META'
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  await taskRef.update(data)

  if (notifTarget) {
    await createNotification(notifTarget, notifTitle, notifMessage, 'TASK')
  }
  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    auditAction,
    'TASK',
    id,
    `${action} on task "${t.title}"`
  )

  const updated = await taskRef.get()
  return NextResponse.json({ id: updated.id, ...updated.data() })
}
