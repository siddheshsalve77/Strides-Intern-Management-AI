import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'
import type { SubmissionField } from '@/lib/types'

function serialize(d: any) {
  return { id: d.id, ...d.data() }
}

// ============================================================
// GET /api/submissions
// Authenticated. ?taskId=<taskId> returns all submission versions for that task
// (assignee + creator/manager can view). ?employeeId=<uid> filters by employee.
// Employees/interns: ?employeeId auto-resolved to their UID.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  const requestedEmployeeId = searchParams.get('employeeId')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  let q: any = adminDb.collection('taskSubmissions')
  if (taskId) {
    // Verify the caller has access to this task
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get()
    if (!taskDoc.exists) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    const task: any = taskDoc.data()!
    const canAccess =
      task.assignedTo === ctx.uid ||
      task.createdBy === ctx.uid ||
      isManager
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    q = q.where('taskId', '==', taskId)
  }
  if (requestedEmployeeId) {
    // Non-managers can only see their own submissions
    if (!isManager && requestedEmployeeId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    q = q.where('employeeId', '==', requestedEmployeeId)
  }

  const snap = await q.limit(100).get()
  const submissions = snap.docs
    .map((d) => serialize(d))
    .sort((a: any, b: any) => (b.version || 0) - (a.version || 0))
  return NextResponse.json(submissions)
}

// ============================================================
// POST /api/submissions
// Authenticated. Creates a new submission version (DRAFT or SUBMITTED).
// The employeeId is ALWAYS derived from the verified token (prevents IDOR).
// Stores structured `fields` (per-requirement), `files` (array of file metadata), `links` (array).
// If status=SUBMITTED: notifies creator/manager + creates review request + updates task status.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const { taskId, submissionNote, fields, files, links, status } = body

  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  // Verify the task exists AND the caller is the assignee (only assignee can submit)
  const taskDoc = await adminDb.collection('tasks').doc(taskId).get()
  if (!taskDoc.exists) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  const taskData: any = taskDoc.data()!

  const isAssignee = taskData.assignedTo === ctx.uid
  const isManagerOverride = hasMinRole(ctx.role, 'HR') // HR can submit on behalf in edge cases
  if (!isAssignee && !isManagerOverride) {
    return NextResponse.json(
      { error: 'Only the assignee can submit work for this task' },
      { status: 403 }
    )
  }

  // Canonical employeeId — derived from token (NOT client body)
  const employeeId = taskData.assignedTo || ctx.uid

  // Get current max version
  const snap = await adminDb
    .collection('taskSubmissions')
    .where('taskId', '==', taskId)
    .limit(100)
    .get()
  const versions = snap.docs.map((d) => (d.data() as any).version || 0)
  const nextVersion = versions.length > 0 ? Math.max(...versions) + 1 : 1

  // Normalize fields shape
  const normalizedFields: SubmissionField[] = Array.isArray(fields)
    ? fields.filter((f: any) => f && f.requirementId).map((f: any) => ({
        requirementId: f.requirementId,
        value: f.value ?? '',
        files: Array.isArray(f.files) ? f.files : [],
      }))
    : []

  const normalizedFiles = Array.isArray(files) ? files : []
  const normalizedLinks = Array.isArray(links) ? links : []

  const now = new Date().toISOString()
  const ref = await adminDb.collection('taskSubmissions').add({
    taskId,
    employeeId, // canonical Firebase UID
    version: nextVersion,
    submissionNote: (submissionNote || '').trim(),
    fields: normalizedFields,
    files: normalizedFiles, // flat list of {name, path, mimeType, size, requirementId?}
    links: normalizedLinks, // flat list of {url, label?, requirementId?}
    status: status || 'DRAFT',
    aiScore: null,
    aiFeedback: '',
    managerScore: null,
    managerFeedback: '',
    managerStatus: null,
    reviewerId: null,
    reviewScheduledAt: null,
    reviewedAt: null,
    submittedAt: status === 'SUBMITTED' ? now : null,
    createdAt: now,
    updatedAt: now,
  })

  // If final submission, notify reviewers + create review request
  if (status === 'SUBMITTED') {
    // Notify creator
    if (taskData.createdBy) {
      await createNotification(
        taskData.createdBy,
        'New task submission',
        `Submission v${nextVersion} for "${taskData.title}"`,
        'TASK'
      )
    }
    // Notify assignee's manager (if different from creator)
    const empDoc = await adminDb.collection('users').doc(employeeId).get()
    if (empDoc.exists && empDoc.data()?.managerId && empDoc.data()!.managerId !== taskData.createdBy) {
      await createNotification(
        empDoc.data()!.managerId,
        'Review needed',
        `New submission for "${taskData.title}"`,
        'TASK'
      )
    }
    // Update task status + link current submission
    await adminDb.collection('tasks').doc(taskId).update({
      status: 'SUBMITTED',
      submittedAt: now,
      submissionNote: (submissionNote || '').trim(),
      currentSubmissionId: ref.id,
      managerStatus: null,
      updatedAt: now,
    })

    // Create review request
    const reviewerId = taskData.createdBy || empDoc.data()?.managerId || null
    await adminDb.collection('reviewRequests').add({
      submissionId: ref.id,
      taskId,
      employeeId,
      reviewerId,
      status: 'PENDING',
      priority: taskData.priority || 'NORMAL',
      scheduledAt: null,
      duration: 20,
      meetingLink: '',
      notes: '',
      createdAt: now,
      updatedAt: now,
    })

    await createAuditLog(ctx.uid, ctx.name || ctx.email, 'SUBMIT', 'TASK_SUBMISSION', ref.id, `Submitted v${nextVersion} for task "${taskData.title}"`)
  } else {
    await createAuditLog(ctx.uid, ctx.name || ctx.email, 'SAVE_DRAFT', 'TASK_SUBMISSION', ref.id, `Saved draft v${nextVersion} for task "${taskData.title}"`)
  }

  const doc = await ref.get()
  return NextResponse.json(serialize(doc))
}

// ============================================================
// PATCH /api/submissions
// Authenticated. Supports:
//  - update draft fields (assignee only, status must be DRAFT)
//  - manager review actions (APPROVE / CHANGES_REQUESTED / REJECT) — managers+ only
//  - convert draft to SUBMITTED
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()
  const { id, action, submissionNote, fields, files, links, status, managerScore, managerFeedback } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const subRef = adminDb.collection('taskSubmissions').doc(id)
  const subDoc = await subRef.get()
  if (!subDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const sub: any = subDoc.data()!

  // Fetch the associated task to check ownership/permissions
  const taskDoc = await adminDb.collection('tasks').doc(sub.taskId).get()
  const taskData: any = taskDoc.exists ? taskDoc.data()! : null

  const isAssignee = sub.employeeId === ctx.uid
  const isCreator = taskData?.createdBy === ctx.uid
  const isManager = hasMinLevel(ctx)

  // Manager review actions
  if (['APPROVE', 'CHANGES_REQUESTED', 'REJECT'].includes(action)) {
    if (!isCreator && !isManager) {
      return NextResponse.json({ error: 'Only the task creator or a manager can review this submission' }, { status: 403 })
    }
    const now = new Date().toISOString()
    const newStatus = action === 'APPROVE' ? 'APPROVED' : action === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'REJECTED'
    const data: any = {
      managerScore: managerScore ?? null,
      managerFeedback: managerFeedback || '',
      managerStatus: newStatus,
      reviewerId: ctx.uid,
      reviewedAt: now,
      status: newStatus,
      updatedAt: now,
    }
    await subRef.update(data)

    // Update task status based on review
    if (taskData) {
      if (action === 'APPROVE') {
        await adminDb.collection('tasks').doc(sub.taskId).update({
          status: 'COMPLETED',
          completedAt: now,
          managerScore: managerScore ?? null,
          managerFeedback: managerFeedback || '',
          managerStatus: 'APPROVED',
          reviewerId: ctx.uid,
          updatedAt: now,
        })
        await createNotification(sub.employeeId, 'Task approved! 🎉', `Your task "${taskData.title}" has been approved${managerScore ? ` (Score: ${managerScore})` : ''}`, 'TASK')
      } else if (action === 'CHANGES_REQUESTED') {
        await adminDb.collection('tasks').doc(sub.taskId).update({
          status: 'IN_PROGRESS',
          managerScore: managerScore ?? null,
          managerFeedback: managerFeedback || '',
          managerStatus: 'CHANGES_REQUESTED',
          reviewerId: ctx.uid,
          updatedAt: now,
        })
        await createNotification(sub.employeeId, 'Changes requested', `Your task "${taskData.title}" needs changes. ${managerFeedback || ''}`.trim(), 'TASK')
      } else if (action === 'REJECT') {
        await adminDb.collection('tasks').doc(sub.taskId).update({
          managerStatus: 'REJECTED',
          managerFeedback: managerFeedback || '',
          reviewerId: ctx.uid,
          updatedAt: now,
        })
        await createNotification(sub.employeeId, 'Submission rejected', `Your submission for "${taskData.title}" was rejected. ${managerFeedback || ''}`.trim(), 'TASK')
      }
      // Mark review requests as completed
      const rrSnap = await adminDb.collection('reviewRequests').where('submissionId', '==', id).get()
      rrSnap.docs.forEach((d) => d.ref.update({ status: 'COMPLETED', updatedAt: now }))
    }
    await createAuditLog(ctx.uid, ctx.name || ctx.email, action, 'TASK_SUBMISSION', id, `${action} on submission v${sub.version} for "${taskData?.title || sub.taskId}"`)
    const updated = await subRef.get()
    return NextResponse.json(serialize(updated))
  }

  // Assignee updating their own draft
  if (!isAssignee) {
    return NextResponse.json({ error: 'Only the assignee can edit this submission' }, { status: 403 })
  }
  if (sub.status !== 'DRAFT' && action !== 'VIEW') {
    return NextResponse.json({ error: 'Cannot modify a submitted version — create a new version instead' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const data: any = { updatedAt: now }
  if (submissionNote !== undefined) data.submissionNote = submissionNote
  if (fields !== undefined) data.fields = Array.isArray(fields) ? fields.filter((f: any) => f && f.requirementId) : []
  if (files !== undefined) data.files = Array.isArray(files) ? files : []
  if (links !== undefined) data.links = Array.isArray(links) ? links : []
  if (status !== undefined) {
    data.status = status
    if (status === 'SUBMITTED') {
      data.submittedAt = now
      // Mirror to task
      await adminDb.collection('tasks').doc(sub.taskId).update({
        status: 'SUBMITTED',
        submittedAt: now,
        submissionNote: submissionNote || sub.submissionNote,
        currentSubmissionId: id,
        managerStatus: null,
        updatedAt: now,
      })
      // Notify creator + manager
      if (taskData?.createdBy) {
        await createNotification(taskData.createdBy, 'Task submitted for review', `"${taskData.title}" has been submitted (v${sub.version})`, 'TASK')
      }
    }
  }
  await subRef.update(data)
  const updated = await subRef.get()
  return NextResponse.json(serialize(updated))
}

function hasMinLevel(ctx: any): boolean {
  return hasMinRole(ctx.role, 'MANAGER')
}
