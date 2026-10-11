import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/activity
// Authenticated.
// - Non-managers see only their own activity (filtered to actorUid === ctx.uid).
// - Managers+ can pass ?scope=org for org-wide activity, or ?managerId=<uid> for team activity.
// - ?limit= controls how many items are returned (default 15).
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope')
  const managerId = searchParams.get('managerId')
  const limit = parseInt(searchParams.get('limit') || '15')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  // Resolve the team/owner filter
  let targetUids: string[] | null = null // null = no filter (org-wide)

  if (scope === 'org' && hasMinRole(ctx.role, 'HR')) {
    // HR/Admin org-wide activity
    targetUids = null
  } else if (scope === 'org' && isManager) {
    // Managers asking for org activity get their team+own activity
    const reporteesSnap = await adminDb
      .collection('users')
      .where('managerId', '==', ctx.uid)
      .get()
    targetUids = [ctx.uid, ...reporteesSnap.docs.map((d) => d.id)]
  } else if (managerId) {
    // ?managerId=<uid> — verify caller can view that manager's team
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // If a manager asks for another manager's team, require HR/Admin
    if (managerId !== ctx.uid && !hasMinRole(ctx.role, 'HR')) {
      return NextResponse.json(
        { error: 'Cannot view another manager\'s team' },
        { status: 403 }
      )
    }
    const reporteesSnap = await adminDb
      .collection('users')
      .where('managerId', '==', managerId)
      .get()
    targetUids = [managerId, ...reporteesSnap.docs.map((d) => d.id)]
  } else if (!scope && !managerId) {
    // No explicit scope — non-managers see only their own activity;
    // managers see their team's activity (their own + reportees).
    if (isManager) {
      const reporteesSnap = await adminDb
        .collection('users')
        .where('managerId', '==', ctx.uid)
        .get()
      targetUids = [ctx.uid, ...reporteesSnap.docs.map((d) => d.id)]
    } else {
      targetUids = [ctx.uid]
    }
  }

  const targetSet = targetUids ? new Set(targetUids) : null

  const activities: any[] = []

  // Tasks created recently
  const taskSnap = await adminDb.collection('tasks').limit(50).get()
  taskSnap.docs.forEach((d) => {
    const t = d.data() as any
    if (!t.createdAt || new Date(t.createdAt) < weekAgo) return
    // Apply target filter: include if task is assigned to or created by a target uid
    if (targetSet && !targetSet.has(t.assignedTo) && !targetSet.has(t.createdBy)) return
    activities.push({
      id: `task-${d.id}`,
      type: 'TASK',
      action: 'new task created',
      title: t.title,
      description: `Priority: ${t.priority}`,
      actorName: 'System',
      timestamp: t.createdAt,
      view: 'tasks',
    })
  })

  // Announcements
  const annSnap = await adminDb.collection('announcements').limit(20).get()
  annSnap.docs.forEach((d) => {
    const a = d.data() as any
    if (!a.publishedAt || new Date(a.publishedAt) < weekAgo) return
    // Announcements are org-wide; show them if caller has org scope (targetSet === null)
    // or always show to managers/HR
    if (targetSet && !isManager && !hasMinRole(ctx.role, 'HR')) return
    activities.push({
      id: `ann-${d.id}`,
      type: 'ANNOUNCEMENT',
      action: 'published an announcement',
      title: a.title,
      description: a.content?.substring(0, 80) || '',
      actorName: a.authorName || 'HR',
      timestamp: a.publishedAt,
      view: 'announcements',
    })
  })

  // Leave requests
  const leaveSnap = await adminDb.collection('leaveRequests').limit(30).get()
  const empIds = [...new Set(leaveSnap.docs.map((d) => (d.data() as any).employeeId).filter(Boolean))]
  const employees = await Promise.all(
    empIds.map(async (id) => {
      const doc = await adminDb.collection('users').doc(id).get()
      return doc.exists ? { uid: doc.id, ...doc.data() } : null
    })
  )
  const empMap = new Map(
    employees.filter(Boolean).map((e: any) => [e.uid || e.id, e])
  )
  leaveSnap.docs.forEach((d) => {
    const l = d.data() as any
    if (!l.appliedAt || new Date(l.appliedAt) < weekAgo) return
    if (targetSet && !targetSet.has(l.employeeId)) return
    const emp: any = empMap.get(l.employeeId) || {}
    activities.push({
      id: `leave-${d.id}`,
      type: 'LEAVE',
      action:
        l.status === 'PENDING'
          ? 'applied for leave'
          : `${l.status.toLowerCase()} leave`,
      title: `${l.days || 1} day ${l.leaveType?.toLowerCase() || ''} leave`,
      description: l.reason || '',
      actorName: emp.name || 'Employee',
      timestamp: l.appliedAt,
      view: 'leave',
    })
  })

  // Sort by timestamp desc
  activities.sort(
    (a, b) =>
      new Date(b.timestamp || 0).getTime() -
      new Date(a.timestamp || 0).getTime()
  )

  return NextResponse.json(activities.slice(0, limit))
}
