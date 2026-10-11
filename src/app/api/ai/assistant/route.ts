import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const { employeeId, message } = await req.json()
  if (!employeeId || !message) return NextResponse.json({ error: 'employeeId and message required' }, { status: 400 })

  const empDoc = await adminDb.collection('users').doc(employeeId).get()
  if (!empDoc.exists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  const employee = empDoc.data()!

  const [tasksSnap, leaveSnap, lbSnap, goalsSnap, perfSnap, learningSnap, holidaysSnap, annSnap] = await Promise.all([
    adminDb.collection('tasks').where('assignedTo', '==', employeeId).limit(15).get(),
    adminDb.collection('leaveRequests').where('employeeId', '==', employeeId).limit(5).get(),
    adminDb.collection('leaveBalances').where('employeeId', '==', employeeId).limit(1).get(),
    adminDb.collection('goals').where('employeeId', '==', employeeId).get(),
    adminDb.collection('performance').where('employeeId', '==', employeeId).limit(1).get(),
    adminDb.collection('learning').where('employeeId', '==', employeeId).get(),
    adminDb.collection('holidays').get(),
    adminDb.collection('announcements').limit(4).get(),
  ])

  const tasks = tasksSnap.docs.map(d => d.data())
  const lb = lbSnap.docs[0]?.data()
  const perf = perfSnap.docs[0]?.data()
  const goals = goalsSnap.docs.map(d => d.data())
  const learning = learningSnap.docs.map(d => d.data())
  const holidays = holidaysSnap.docs.map(d => d.data()).filter(h => h.date && new Date(h.date) >= new Date()).slice(0, 5)
  const announcements = annSnap.docs.map(d => d.data())

  const ctx = {
    employee: { name: employee.name, role: employee.role, designation: employee.designation, department: employee.department, team: employee.team },
    tasks: tasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, deadline: t.deadline })),
    leave: { balances: lb ? { casual: lb.casualLeave, sick: lb.sickLeave, earned: lb.earnedLeave } : null, recent: leaveSnap.docs.map(d => d.data()) },
    goals: goals.map(g => ({ title: g.title, progress: g.progress, deadline: g.deadline })),
    performance: perf ? { overall: perf.overall, taskCompletion: perf.taskCompletion, quality: perf.quality, summary: perf.summary } : null,
    learning: learning.map(l => ({ course: l.courseName, progress: l.progress, status: l.status })),
    upcomingHolidays: holidays.map(h => ({ name: h.name, date: h.date })),
    announcements: announcements.map(a => ({ title: a.title, content: a.content?.substring(0, 120) })),
    today: new Date().toISOString().split('T')[0],
  }

  const systemPrompt = `You are STRIDES AI, the intelligent work assistant for employees at Strides Software. You help with tasks, leave, performance, learning, and policies. Be concise, friendly and actionable. Use the provided employee context.

Employee context (JSON):
${JSON.stringify(ctx, null, 2)}`

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: message }],
      thinking: { type: 'disabled' },
    })
    return NextResponse.json({ reply: completion.choices[0]?.message?.content || 'I could not generate a response.' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, reply: 'The AI assistant is temporarily unavailable.' }, { status: 500 })
  }
}
