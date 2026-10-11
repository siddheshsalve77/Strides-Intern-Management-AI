import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const scope = searchParams.get('scope')

  let targetIds: string[] = []
  if (scope === 'team' && employeeId) {
    const teamSnap = await adminDb.collection('users').where('managerId', '==', employeeId).get()
    targetIds = teamSnap.docs.map(d => d.id)
  } else if (employeeId) {
    targetIds = [employeeId]
  }

  if (targetIds.length === 0) return NextResponse.json([])

  const now = new Date()
  const weeks: any[] = []
  for (let i = 7; i >= 0; i--) {
    const end = new Date(now); end.setDate(end.getDate() - i * 7); end.setHours(23, 59, 59, 999)
    const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
    weeks.push({ week: `W${8 - i}`, label: start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), completed: 0, created: 0, submitted: 0, startDate: start, endDate: end })
  }

  const firstWeekStart = weeks[0].startDate
  const lastWeekEnd = weeks[weeks.length - 1].endDate

  const tasksSnap = await adminDb.collection('tasks').limit(200).get()
  const tasks = tasksSnap.docs.map(d => d.data()).filter(t => targetIds.includes(t.assignedTo))

  const createdTasks = tasks.filter(t => t.createdAt && new Date(t.createdAt) >= firstWeekStart && new Date(t.createdAt) <= lastWeekEnd)
  const completedTasks = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= firstWeekStart && new Date(t.completedAt) <= lastWeekEnd)
  const submittedTasks = tasks.filter(t => t.submittedAt && new Date(t.submittedAt) >= firstWeekStart && new Date(t.submittedAt) <= lastWeekEnd)

  weeks.forEach(w => {
    w.created = createdTasks.filter(t => new Date(t.createdAt) >= w.startDate && new Date(t.createdAt) <= w.endDate).length
    w.completed = completedTasks.filter(t => new Date(t.completedAt) >= w.startDate && new Date(t.completedAt) <= w.endDate).length
    w.submitted = submittedTasks.filter(t => new Date(t.submittedAt) >= w.startDate && new Date(t.submittedAt) <= w.endDate).length
  })

  return NextResponse.json(weeks.map(w => ({ week: w.week, label: w.label, completed: w.completed, created: w.created, submitted: w.submitted })))
}
