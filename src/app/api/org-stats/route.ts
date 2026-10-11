import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const managerId = searchParams.get('managerId')
  const scope = searchParams.get('scope')

  const today = new Date(); today.setHours(0, 0, 0, 0)

  if (scope === 'org') {
    const [totalEmps, presentToday, pendingLeaves, openTickets, pendingTasks, overdueTasks, internCount, activeProjects] = await Promise.all([
      adminDb.collection('users').where('status', '==', 'ACTIVE').get(),
      adminDb.collection('attendance').where('date', '==', today.toISOString()).get(),
      adminDb.collection('leaveRequests').where('status', '==', 'PENDING').get(),
      adminDb.collection('hrRequests').get(),
      adminDb.collection('tasks').get(),
      adminDb.collection('tasks').get(),
      adminDb.collection('users').where('role', '==', 'INTERN').get(),
      adminDb.collection('projects').where('status', '==', 'ACTIVE').get(),
    ])
    const present = presentToday.docs.filter((d) => ['PRESENT', 'LATE', 'WFH'].includes(d.data().status)).length
    const openT = openTickets.docs.filter((d) => !['RESOLVED', 'CLOSED'].includes(d.data().status)).length
    const pendingT = pendingTasks.docs.filter((d) => ['CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW'].includes(d.data().status)).length
    const overdueT = overdueTasks.docs.filter((d) => d.data().deadline && new Date(d.data().deadline) < new Date() && !['COMPLETED', 'APPROVED'].includes(d.data().status)).length

    return NextResponse.json({
      scope: 'org', totalEmployees: totalEmps.size, presentToday: present,
      attendancePct: totalEmps.size > 0 ? Math.round((present / totalEmps.size) * 100) : 0,
      pendingLeaves: pendingLeaves.size, openTickets: openT, pendingTasks: pendingT,
      overdueTasks: overdueT, onboardingCount: internCount.size, activeProjects: activeProjects.size,
    })
  }

  if (managerId) {
    const teamSnap = await adminDb.collection('users').where('managerId', '==', managerId).get()
    const teamIds = teamSnap.docs.map((d) => d.id)
    if (teamIds.length === 0) {
      return NextResponse.json({ scope: 'team', teamSize: 0, presentToday: 0, attendancePct: 0, pendingLeaves: 0, openTickets: 0, pendingTasks: 0, overdueTasks: 0 })
    }
    const [attSnap, leaveSnap, reqSnap, taskSnap] = await Promise.all([
      adminDb.collection('attendance').where('employeeId', 'in', teamIds.slice(0, 10)).get(),
      adminDb.collection('leaveRequests').get(),
      adminDb.collection('hrRequests').get(),
      adminDb.collection('tasks').get(),
    ])
    const present = attSnap.docs.filter((d) => {
      const data = d.data()
      return data.date && new Date(data.date).toDateString() === today.toDateString() && ['PRESENT', 'LATE', 'WFH'].includes(data.status)
    }).length
    const pendLeaves = leaveSnap.docs.filter((d) => teamIds.includes(d.data().employeeId) && d.data().status === 'PENDING').length
    const openT = reqSnap.docs.filter((d) => teamIds.includes(d.data().employeeId) && !['RESOLVED', 'CLOSED'].includes(d.data().status)).length
    const pendT = taskSnap.docs.filter((d) => teamIds.includes(d.data().assignedTo) && ['CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW'].includes(d.data().status)).length
    const overdueT = taskSnap.docs.filter((d) => teamIds.includes(d.data().assignedTo) && d.data().deadline && new Date(d.data().deadline) < new Date() && !['COMPLETED', 'APPROVED'].includes(d.data().status)).length

    return NextResponse.json({
      scope: 'team', teamSize: teamIds.length, presentToday: present,
      attendancePct: teamIds.length > 0 ? Math.round((present / teamIds.length) * 100) : 0,
      pendingLeaves: pendLeaves, openTickets: openT, pendingTasks: pendT, overdueTasks: overdueT,
    })
  }

  return NextResponse.json({ error: 'managerId or scope=org required' }, { status: 400 })
}
