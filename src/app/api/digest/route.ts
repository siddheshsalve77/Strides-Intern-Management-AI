import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  const [attSnap, tasksSnap, leaveSnap, goalsSnap, learningSnap, meetingsSnap, expensesSnap] = await Promise.all([
    adminDb.collection('attendance').where('employeeId', '==', employeeId).get(),
    adminDb.collection('tasks').where('assignedTo', '==', employeeId).get(),
    adminDb.collection('leaveRequests').where('employeeId', '==', employeeId).get(),
    adminDb.collection('goals').where('employeeId', '==', employeeId).get(),
    adminDb.collection('learning').where('employeeId', '==', employeeId).get(),
    adminDb.collection('meetings').limit(100).get(),
    adminDb.collection('expenses').where('employeeId', '==', employeeId).get(),
  ])

  const attendance = attSnap.docs.map(d => d.data()).filter(a => a.date && new Date(a.date) >= weekAgo)
  const presentDays = attendance.filter(a => ['PRESENT', 'LATE', 'WFH'].includes(a.status)).length
  const totalHours = attendance.reduce((s, a) => s + (a.workHours || 0), 0)
  const tasks = tasksSnap.docs.map(d => d.data())
  const tasksCompleted = tasks.filter(t => ['COMPLETED', 'APPROVED'].includes(t.status)).length
  const tasksInProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const goals = goalsSnap.docs.map(d => d.data())
  const coursesCompleted = learningSnap.docs.filter(d => d.data().status === 'COMPLETED').length
  const meetings = meetingsSnap.docs.filter(d => { const m = d.data(); return m.attendeeIds?.includes(employeeId) && m.startTime && new Date(m.startTime) >= weekAgo }).length

  return NextResponse.json({
    week: `${weekAgo.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
    summary: {
      attendance: { presentDays, lateDays: attendance.filter(a => a.status === 'LATE').length, totalHours: Math.round(totalHours * 10) / 10, avgHoursPerDay: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0 },
      tasks: { completed: tasksCompleted, inProgress: tasksInProgress, created: tasks.length },
      goals: { active: goals.filter(g => g.status === 'ACTIVE').length, completed: goals.filter(g => g.progress >= 100).length },
      learning: { coursesCompleted },
      meetings: { total: meetings, upcoming: meetings },
      leaves: { pending: leaveSnap.docs.filter(d => d.data().status === 'PENDING').length },
      expenses: { total: expensesSnap.size },
    },
    highlights: [
      tasksCompleted > 0 ? `Completed ${tasksCompleted} task${tasksCompleted > 1 ? 's' : ''}` : null,
      presentDays > 0 ? `Present ${presentDays} days, logged ${Math.round(totalHours * 10) / 10}h` : null,
      coursesCompleted > 0 ? `Completed ${coursesCompleted} course${coursesCompleted > 1 ? 's' : ''}` : null,
    ].filter(Boolean),
  })
}
