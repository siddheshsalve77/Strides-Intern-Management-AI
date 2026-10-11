import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { requireAuth, hasMinRole } from '@/lib/api-auth'

// ============================================================
// GET /api/analytics
// Authenticated. Non-managers get analytics for their own UID (canonical).
// Managers+ can pass ?employeeId=<uid> for their reportees (HR/Admin for anyone).
// Backward compat: ?employeeId=me alias for ctx.uid.
// ============================================================
export async function GET(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx

  const { searchParams } = new URL(req.url)
  const requestedEmployeeId = searchParams.get('employeeId')
  const isManager = hasMinRole(ctx.role, 'MANAGER')

  let targetUid: string
  if (!requestedEmployeeId || requestedEmployeeId === 'me') {
    targetUid = ctx.uid
  } else {
    if (!isManager && requestedEmployeeId !== ctx.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // MANAGER role must verify team membership for non-self queries
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

  const employeeId = targetUid

  // Gather analytics data from Firestore
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  // Tasks
  const tasksSnap = await adminDb
    .collection('tasks')
    .where('assignedTo', '==', employeeId)
    .get()
  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Attendance last 14 days
  const attSnap = await adminDb
    .collection('attendance')
    .where('employeeId', '==', employeeId)
    .get()
  const attendance = attSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a: any) => new Date(a.date) >= new Date(now.getTime() - 14 * 86400000))

  // Goals
  const goalsSnap = await adminDb
    .collection('goals')
    .where('employeeId', '==', employeeId)
    .get()
  const goals = goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Performance
  const perfSnap = await adminDb
    .collection('performance')
    .where('employeeId', '==', employeeId)
    .get()
  const perf = perfSnap.docs[0]?.data() || null

  // Build 14-day attendance trend
  const trend = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const rec = attendance.find(
      (a: any) => new Date(a.date).toDateString() === d.toDateString()
    )
    const dow = d.getDay()
    let hours = 0,
      status = 'WEEKEND'
    if (dow === 0 || dow === 6) {
      status = 'WEEKEND'
    } else if (rec) {
      hours = rec.workHours || 0
      status = rec.status
    } else {
      status = 'ABSENT'
    }
    trend.push({
      date: d.toISOString().split('T')[0],
      hours: Math.round(hours * 10) / 10,
      status,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
    })
  }

  // Task distribution by status
  const taskDistribution: Record<string, number> = {}
  tasks.forEach((t: any) => {
    taskDistribution[t.status] = (taskDistribution[t.status] || 0) + 1
  })

  // Weekday hours
  const weekdayHours = [0, 0, 0, 0, 0, 0, 0]
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0]
  attendance.forEach((a: any) => {
    if (a.workHours > 0) {
      const dow = new Date(a.date).getDay()
      weekdayHours[dow] += a.workHours
      weekdayCount[dow] += 1
    }
  })
  const avgWeekdayHours = weekdayHours.map((h, i) =>
    weekdayCount[i] > 0 ? Math.round((h / weekdayCount[i]) * 10) / 10 : 0
  )

  const completedTasks = tasks.filter((t: any) =>
    ['COMPLETED', 'APPROVED'].includes(t.status)
  ).length

  return NextResponse.json({
    attendanceTrend: trend,
    taskDistribution,
    avgWeekdayHours,
    goalProgress: goals.map((g: any) => ({
      title: g.title,
      progress: g.progress,
      status: g.status,
    })),
    performance: perf
      ? {
          overall: perf.overall || 0,
          goalAchievement: perf.goalAchievement || 0,
          taskCompletion: perf.taskCompletion || 0,
          quality: perf.quality || 0,
          attendance: perf.attendance || 0,
          managerRating: perf.managerRating || 0,
        }
      : null,
    totalTasks: tasks.length,
    completedTasks,
  })
}
