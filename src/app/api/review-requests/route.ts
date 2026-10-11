import { NextRequest, NextResponse } from 'next/server'
import { adminDb, createNotification, createAuditLog } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/review-requests
// Authenticated. Non-managers see only review requests where they are the employee OR the assigned reviewer.
// Managers+ can pass ?reviewerId=<uid> for their reportees; HR/Admin can list all.
// ?scope=all — HR/Admin: all review requests.
// Backward compat: ?reviewerId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedReviewerId = searchParams.get('reviewerId')
  const scope = searchParams.get('scope')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  // HR/Admin scope=all — all review requests
  if (scope === 'all' && hasMinRole(ctx.role, 'HR')) {
    const snap = await adminDb.collection('reviewRequests').limit(200).get()
    let requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    requests = await enrich(requests)
    return NextResponse.json(requests)
  }

  // Resolve reviewer target UID
  let reviewerUid: string
  if (!requestedReviewerId || requestedReviewerId === 'me') {
    reviewerUid = ctx.uid
  } else {
    if (!isManager && requestedReviewerId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (ctx.role === 'MANAGER' && requestedReviewerId !== ctx.uid) {
      const empDoc = await adminDb.collection('users').doc(requestedReviewerId).get()
      if (!empDoc.exists) {
        return NextResponse.json({ error: 'Reviewer not found' }, { status: 404 })
      }
      const empData: any = empDoc.data()
      if (empData.managerId && empData.managerId !== ctx.uid) {
        return NextResponse.json(
          { error: 'Reviewer is not in your team' },
          { status: 403 }
        )
      }
    }
    reviewerUid = requestedReviewerId
  }

  // Fetch all review requests where ctx.uid is the employee OR the assigned reviewer
  const [asReviewerSnap, asEmpSnap] = await Promise.all([
    adminDb.collection('reviewRequests').where('reviewerId', '==', reviewerUid).limit(100).get(),
    adminDb.collection('reviewRequests').where('employeeId', '==', reviewerUid).limit(100).get(),
  ])
  const seen = new Set<string>()
  let requests: any[] = []
  for (const d of [...asReviewerSnap.docs, ...asEmpSnap.docs]) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    requests.push({ id: d.id, ...d.data() })
  }
  requests = await enrich(requests)
  return NextResponse.json(requests)
}

async function enrich(requests: any[]) {
  const empIds = [...new Set(requests.map((r: any) => r.employeeId).filter(Boolean))]
  const revIds = [...new Set(requests.filter((r: any) => r.reviewerId).map((r: any) => r.reviewerId))]
  const taskIds = [...new Set(requests.map((r: any) => r.taskId).filter(Boolean))]
  const subIds = [...new Set(requests.filter((r: any) => r.submissionId).map((r: any) => r.submissionId))]

  const [employees, reviewers, tasks, submissions] = await Promise.all([
    Promise.all(empIds.map(async (id: string) => {
      const d = await adminDb.collection('users').doc(id).get()
      return d.exists ? { uid: d.id, ...d.data() } : null
    })),
    Promise.all(revIds.map(async (id: string) => {
      const d = await adminDb.collection('users').doc(id).get()
      return d.exists ? { uid: d.id, ...d.data() } : null
    })),
    Promise.all(taskIds.map(async (id: string) => {
      const d = await adminDb.collection('tasks').doc(id).get()
      return d.exists ? { id: d.id, ...d.data() } : null
    })),
    Promise.all(subIds.map(async (id: string) => {
      const d = await adminDb.collection('taskSubmissions').doc(id).get()
      return d.exists ? { id: d.id, ...d.data() } : null
    })),
  ])

  const empMap = new Map(employees.filter(Boolean).map((e: any) => [e.uid || e.id, e]))
  const revMap = new Map(reviewers.filter(Boolean).map((e: any) => [e.uid || e.id, e]))
  const taskMap = new Map(tasks.filter(Boolean).map((t: any) => [t.id, t]))
  const subMap = new Map(submissions.filter(Boolean).map((s: any) => [s.id, s]))

  return requests.map((r: any) => ({
    ...r,
    employee: empMap.get(r.employeeId) || undefined,
    reviewer: r.reviewerId ? (revMap.get(r.reviewerId) || undefined) : undefined,
    task: taskMap.get(r.taskId)
      ? {
          id: taskMap.get(r.taskId).id,
          title: taskMap.get(r.taskId).title,
          deadline: taskMap.get(r.taskId).deadline,
          priority: taskMap.get(r.taskId).priority,
        }
      : undefined,
    submission: r.submissionId ? (subMap.get(r.submissionId) || undefined) : undefined,
  }))
}

// ============================================================
// PATCH /api/review-requests
// Authenticated. Schedule/Reschedule/Cancel — managers+ only.
// reviewerId (if changed) is verified to be a manager in the employee's reporting chain.
// ============================================================
export async function PATCH(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const isManager = hasMinRole(ctx.role, 'MANAGER')
  if (!isManager) {
    return NextResponse.json(
      { error: 'Only managers can update review requests' },
      { status: 403 }
    )
  }

  const { id, scheduledAt, duration, reviewerId, meetingLink, notes, status, priority } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const rrRef = adminDb.collection('reviewRequests').doc(id)
  const rrDoc = await rrRef.get()
  if (!rrDoc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const rrData: any = rrDoc.data()

  // MANAGER role (not HR/Admin) must be the employee's direct manager
  if (ctx.role === 'MANAGER') {
    const empDoc = await adminDb.collection('users').doc(rrData.employeeId).get()
    const empData: any = empDoc.exists ? empDoc.data() : {}
    if (empData.managerId && empData.managerId !== ctx.uid) {
      return NextResponse.json(
        { error: 'Employee is not in your team' },
        { status: 403 }
      )
    }
  }

  // If a new reviewerId is being set, validate that reviewer exists
  if (reviewerId !== undefined && reviewerId) {
    const revDoc = await adminDb.collection('users').doc(reviewerId).get()
    if (!revDoc.exists) {
      return NextResponse.json({ error: 'Reviewer not found' }, { status: 400 })
    }
  }

  const data: any = { updatedAt: new Date().toISOString() }
  if (scheduledAt !== undefined)
    data.scheduledAt = scheduledAt ? new Date(scheduledAt).toISOString() : null
  if (duration !== undefined) data.duration = duration
  if (reviewerId !== undefined) data.reviewerId = reviewerId || null
  if (meetingLink !== undefined) data.meetingLink = meetingLink
  if (notes !== undefined) data.notes = notes
  if (status !== undefined) data.status = status
  if (priority !== undefined) data.priority = priority

  await rrRef.update(data)

  const updated = await rrRef.get()
  const rrDataAfter: any = updated.data()!

  if (status === 'SCHEDULED' && scheduledAt) {
    // Notify intern
    const taskDoc = await adminDb.collection('tasks').doc(rrDataAfter.taskId).get()
    await createNotification(
      rrDataAfter.employeeId,
      'Review scheduled',
      `Your review for "${taskDoc.data()?.title}" is scheduled`,
      'TASK'
    )
    // Notify reviewer
    if (rrDataAfter.reviewerId) {
      const empDoc = await adminDb.collection('users').doc(rrDataAfter.employeeId).get()
      await createNotification(
        rrDataAfter.reviewerId,
        'Review assigned',
        `Review with ${empDoc.data()?.name}`,
        'TASK'
      )
    }
  } else if (status === 'CANCELLED') {
    await createNotification(
      rrDataAfter.employeeId,
      'Review cancelled',
      `Your review has been cancelled. ${notes || ''}`,
      'TASK'
    )
  }

  await createAuditLog(
    ctx.uid,
    ctx.name || ctx.email,
    'UPDATE',
    'REVIEW_REQUEST',
    id,
    `Review request ${id}${status ? ` → ${status}` : ''}`
  )

  return NextResponse.json({ id: updated.id, ...rrDataAfter })
}
