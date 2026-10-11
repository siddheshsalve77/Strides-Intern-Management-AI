import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const { employeeId } = await req.json()
  if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

  const employeeDoc = await adminDb.collection('users').doc(employeeId).get()
  if (!employeeDoc.exists) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  const employee = employeeDoc.data()!

  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const [attSnap, tasksSnap, goalsSnap, learningSnap, meetingsSnap] = await Promise.all([
    adminDb.collection('attendance').where('employeeId', '==', employeeId).get(),
    adminDb.collection('tasks').where('assignedTo', '==', employeeId).get(),
    adminDb.collection('goals').where('employeeId', '==', employeeId).get(),
    adminDb.collection('learning').where('employeeId', '==', employeeId).get(),
    adminDb.collection('meetings').limit(50).get(),
  ])

  const attendance = attSnap.docs.map(d => d.data()).filter(a => a.date && new Date(a.date) >= weekAgo)
  const presentDays = attendance.filter(a => ['PRESENT', 'LATE', 'WFH'].includes(a.status)).length
  const totalHours = attendance.reduce((s, a) => s + (a.workHours || 0), 0)
  const tasks = tasksSnap.docs.map(d => d.data())
  const tasksCompleted = tasks.filter(t => ['COMPLETED', 'APPROVED'].includes(t.status)).length
  const goals = goalsSnap.docs.map(d => d.data())
  const learning = learningSnap.docs.map(d => d.data())
  const meetings = meetingsSnap.docs.filter(d => { const m = d.data(); return m.attendeeIds?.includes(employeeId) }).length

  const context = {
    name: employee.name, role: employee.role,
    week: `${weekAgo.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`,
    attendance: { presentDays, totalHours: Math.round(totalHours * 10) / 10 },
    tasks: { completed: tasksCompleted, inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length, titles: tasks.slice(0, 5).map(t => t.title) },
    goals: goals.slice(0, 3).map(g => ({ title: g.title, progress: g.progress })),
    learning: learning.slice(0, 3).map(l => ({ course: l.courseName, progress: l.progress })),
    meetings,
  }

  const prompt = `You are STRIDES AI, generating a weekly digest for ${context.name} (${context.role}). Write a friendly, motivating digest in Markdown with sections: 📊 Your Week at a Glance, ✅ Accomplishments, 🎯 Goals Progress, 📈 Areas to Focus Next Week, 💡 AI Tip. Keep under 200 words.

Data: ${JSON.stringify(context)}`

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'assistant', content: 'You are a helpful work assistant.' }, { role: 'user', content: prompt }],
      thinking: { type: 'disabled' },
    })
    return NextResponse.json({ digest: completion.choices[0]?.message?.content || 'Unable to generate.' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, digest: 'The weekly digest is temporarily unavailable.' }, { status: 500 })
  }
}
