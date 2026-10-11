import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole, type AuthContext } from '@/lib/api-auth'
import type { SubmissionRequirement } from '@/lib/types'

function serialize(d: any) {
  return { id: d.id, ...d.data() }
}

// ============================================================
// GET /api/tasks
// ============================================================
// Authenticated. Derives the current user from the Firebase ID token.
// - Employees/Interns: always return tasks assigned to them (assignedTo == uid).
//   The client-supplied `assigneeId` param is IGNORED for them (prevents IDOR).
// - Managers/HR/Admin: by default return tasks they created. Optional filters:
//   ?creatorId=me        — explicit self-filter (default for managers)
//   ?assigneeId=me       — tasks assigned to me (e.g., manager is also assignee)
//   ?scope=team          — tasks created by me OR assigned to my reportees
//   ?scope=all           — HR/Admin only: all tasks
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // Employees/interns: ONLY their assigned tasks. Ignore client-supplied assigneeId.
  if (!isManager) {
    return await runTasksQuery({ assigneeUid: ctx.uid }, ctx)
  }

  // Managers/HR/Admin: default to tasks they created
  const scope = searchParams.get('scope')
  const creatorId = searchParams.get('creatorId')
  const assigneeId = searchParams.get('assigneeId')
  const projectId = searchParams.get('projectId')

  // HR/Admin can request ?scope=all
  if (scope === 'all' && hasMinRole(ctx.role, 'HR')) {
    return await runTasksQuery({ projectId: projectId || undefined }, ctx)
  }

  // Manager asking "tasks assigned to me" (e.g., manager is also an assignee)
  if (assigneeId === 'me' || assigneeId === ctx.uid) {
    return await runTasksQuery({ assigneeUid: ctx.uid, projectId: projectId || undefined }, ctx)
  }

  // Manager asking for team tasks (tasks they created + tasks assigned to their reportees)
  if (scope === 'team') {
    return await runTeamTasksQuery(ctx, projectId || undefined)
  }

  // Default: tasks created by me. Allow explicit creatorId=me (ignored otherwise).
  const filterCreator = creatorId === 'me' || creatorId === ctx.uid || !creatorId ? ctx.uid : null
  if (filterCreator) {
    return await runTasksQuery({ creatorUid: filterCreator, projectId: projectId || undefined }, ctx)
  }

  // Fallback: tasks created by the supplied creatorId (manager can view other managers' tasks too in scope=team)
  return await runTasksQuery({ creatorUid: creatorId || undefined, projectId: projectId || undefined }, ctx)
}

async function runTasksQuery(
  opts: { assigneeUid?: string; creatorUid?: string; projectId?: string },
  ctx: AuthContext
) {
  let q: any = adminDb.collection('tasks')
  if (opts.assigneeUid) q = q.where('assignedTo', '==', opts.assigneeUid)
  if (opts.creatorUid) q = q.where('createdBy', '==', opts.creatorUid)
  if (opts.projectId) q = q.where('projectId', '==', opts.projectId)

  const snap = await q.limit(200).get()
  // Sort client-side to avoid composite index requirement
  const tasks = snap.docs
    .map((d: any) => serialize(d))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )

  return NextResponse.json(await enrichTasks(tasks))
}

async function runTeamTasksQuery(ctx: AuthContext, projectId?: string) {
  // Get all reportees of the manager
  const reporteesSnap = await adminDb
    .collection('users')
    .where('managerId', '==', ctx.uid)
    .get()
  const teamUids = [ctx.uid, ...reporteesSnap.docs.map((d) => d.id)]

  // Fetch tasks created by me + tasks assigned to anyone in my team
  // We do these as two separate queries (avoid IN list composite index issues)
  const [createdSnap, assignedSnap] = await Promise.all([
    adminDb.collection('tasks').where('createdBy', '==', ctx.uid).limit(200).get(),
    adminDb.collection('tasks').where('assignedTo', 'in', teamUids.slice(0, 30)).limit(200).get(),
  ])

  const seen = new Set<string>()
  const tasks: any[] = []
  for (const d of [...createdSnap.docs, ...assignedSnap.docs]) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    if (projectId) {
      const data = d.data() as any
      if (data.projectId !== projectId) continue
    }
    tasks.push(serialize(d))
  }
  tasks.sort(
    (a: any, b: any) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )

  return NextResponse.json(await enrichTasks(tasks))
}

// Fetch assignee + creator + project names for each task
async function enrichTasks(tasks: any[]) {
  const assigneeIds = [...new Set(tasks.map((t) => t.assignedTo).filter(Boolean))]
  const creatorIds = [...new Set(tasks.map((t) => t.createdBy).filter(Boolean))]
  const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))]

  const [assignees, creators, projects] = await Promise.all([
    Promise.all(
      assigneeIds.map(async (id: string) => {
        const doc = await adminDb.collection('users').doc(id).get()
        return doc.exists ? { uid: doc.id, id: doc.id, ...doc.data() } : null
      })
    ),
    Promise.all(
      creatorIds.map(async (id: string) => {
        const doc = await adminDb.collection('users').doc(id).get()
        return doc.exists ? { uid: doc.id, id: doc.id, ...doc.data() } : null
      })
    ),
    Promise.all(
      projectIds.map(async (id: string) => {
        const doc = await adminDb.collection('projects').doc(id).get()
        return doc.exists ? { id: doc.id, ...doc.data() } : null
      })
    ),
  ])

  const assigneeMap = new Map(
    assignees.filter(Boolean).map((a: any) => [a.uid || a.id, a])
  )
  const creatorMap = new Map(
    creators.filter(Boolean).map((c: any) => [c.uid || c.id, c])
  )
  const projectMap = new Map(
    projects.filter(Boolean).map((p: any) => [p.id, p])
  )

  return tasks.map((t: any) => ({
    ...t,
    assignee: t.assignedTo ? assigneeMap.get(t.assignedTo) || null : null,
    creator: t.createdBy ? creatorMap.get(t.createdBy) || null : null,
    project: t.projectId ? projectMap.get(t.projectId) || null : null,
  }))
}

// ============================================================
// POST /api/tasks
// ============================================================
// Authenticated. Managers/HR/Admin only.
// Derives `createdBy` from the verified Firebase ID token (NOT the client body).
// Validates `assigneeId` corresponds to a real employee UID.
// Stores `assignedTo` = canonical Firebase UID.
// Creates a notification for the assignee on assignment.
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  if (!hasMinRole(ctx.role, 'MANAGER')) {
    return NextResponse.json({ error: 'Only managers can create tasks' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    description,
    assigneeId, // expected to be a Firebase UID
    priority,
    deadline,
    expectedDeliverable,
    evaluationCriteria,
    rubric,
    requirements,
    submissionRequirements,
    projectId,
  } = body

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  // Validate assigneeId (if provided) corresponds to a real employee
  let assigneeProfile: any = null
  if (assigneeId) {
    const aDoc = await adminDb.collection('users').doc(assigneeId).get()
    if (!aDoc.exists) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 400 })
    }
    assigneeProfile = { uid: aDoc.id, ...aDoc.data() }
    // Optional: ensure assignee is in the manager's team (or HR/Admin override)
    if (ctx.role === 'MANAGER' && assigneeProfile.managerId && assigneeProfile.managerId !== ctx.uid) {
      return NextResponse.json(
        { error: 'Assignee is not in your team' },
        { status: 403 }
      )
    }
  }

  // Canonical: createdBy is derived from the verified token, NEVER the client body.
  const createdBy = ctx.uid

  // Validate submissionRequirements shape if provided
  let normalizedReqs: SubmissionRequirement[] = []
  if (Array.isArray(submissionRequirements)) {
    normalizedReqs = submissionRequirements
      .filter((r: any) => r && r.type && r.label)
      .map((r: any) => {
        const req: any = {
          id: r.id || `req_${Math.random().toString(36).slice(2, 10)}`,
          type: r.type,
          label: r.label,
          helpText: r.helpText || '',
          required: !!r.required,
        }
        // Only include optional fields when they have actual values (Firestore rejects undefined)
        if (Array.isArray(r.options) && r.options.length > 0) req.options = r.options
        if (typeof r.maxLength === 'number') req.maxLength = r.maxLength
        if (typeof r.maxFiles === 'number') req.maxFiles = r.maxFiles
        if (Array.isArray(r.acceptedTypes) && r.acceptedTypes.length > 0) req.acceptedTypes = r.acceptedTypes
        return req
      })
  }

  const now = new Date().toISOString()
  const ref = await adminDb.collection('tasks').add({
    title: title.trim(),
    description: (description || '').trim(),
    assignedTo: assigneeId || null, // canonical Firebase UID
    createdBy, // canonical Firebase UID — derived from token
    projectId: projectId || null,
    status: assigneeId ? 'ASSIGNED' : 'CREATED',
    priority: priority || 'MEDIUM',
    deadline: deadline || null,
    startDate: now,
    expectedDeliverable: (expectedDeliverable || '').trim(),
    evaluationCriteria: (evaluationCriteria || '').trim(),
    rubric: rubric || null,
    requirements: requirements || null,
    submissionRequirements: normalizedReqs,
    submittedAt: null,
    completedAt: null,
    aiScore: null,
    aiFeedback: '',
    managerScore: null,
    managerFeedback: '',
    managerStatus: null, // APPROVED | CHANGES_REQUESTED | REJECTED
    reviewerId: null,
    submissionNote: '',
    currentSubmissionId: null,
    createdAt: now,
    updatedAt: now,
  })

  // Notify the assignee — using the canonical Firebase UID
  if (assigneeId) {
    await createNotification(
      assigneeId,
      'New task assigned to you',
      `You have been assigned: "${title.trim()}"`,
      'TASK'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'CREATE',
    'TASK',
    ref.id,
    `Created task "${title.trim()}"${assigneeId ? ` assigned to ${assigneeProfile?.name || assigneeId}` : ''}`
  )

  const doc = await ref.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
