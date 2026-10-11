import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const { taskId } = await req.json()
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const taskDoc = await adminDb.collection('tasks').doc(taskId).get()
  if (!taskDoc.exists) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  const task = taskDoc.data()!

  const empDoc = task.assignedTo ? await adminDb.collection('users').doc(task.assignedTo).get() : null
  const assigneeName = empDoc?.exists ? empDoc.data()!.name : 'Unknown'

  const prompt = `You are an AI task evaluator at Strides Software. Evaluate this task submission and provide a JSON response only.

Task: ${task.title}
Description: ${task.description}
Expected Deliverable: ${task.expectedDeliverable}
Evaluation Criteria: ${task.evaluationCriteria}
Assignee: ${assigneeName}
Submission Note: ${task.submissionNote || '(no note)'}
Rubric: ${task.rubric || 'Standard rubric'}

Respond with STRICT JSON: {"score": <0-100>, "requirementAnalysis": "<1-2 sentences>", "strengths": ["...", "..."], "weaknesses": ["...", "..."], "suggestions": ["...", "..."], "missingRequirements": ["...", "..."]}
Return ONLY the JSON.`

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'assistant', content: 'You are a precise JSON-only task evaluator.' }, { role: 'user', content: prompt }],
      thinking: { type: 'disabled' },
    })
    const raw = completion.choices[0]?.message?.content || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, requirementAnalysis: raw }
    const score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)))
    const feedback = `**Requirement Analysis:** ${parsed.requirementAnalysis || 'N/A'}\n\n**Strengths:**\n${(parsed.strengths || []).map((s: string) => `- ${s}`).join('\n')}\n\n**Weaknesses:**\n${(parsed.weaknesses || []).map((s: string) => `- ${s}`).join('\n')}\n\n**Suggestions:**\n${(parsed.suggestions || []).map((s: string) => `- ${s}`).join('\n')}\n\n**Missing Requirements:**\n${(parsed.missingRequirements || []).map((s: string) => `- ${s}`).join('\n') || '- None identified'}`

    await adminDb.collection('tasks').doc(taskId).update({ aiScore: score, aiFeedback: feedback, status: 'UNDER_REVIEW', updatedAt: new Date().toISOString() })
    return NextResponse.json({ taskId, score, feedback, parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI evaluation failed' }, { status: 500 })
  }
}
