import { NextRequest, NextResponse } from 'next/server'
import { FAQ_CATEGORIES } from '@/app/api/help/route'

export async function POST(req: NextRequest) {
  const { question } = await req.json()
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 })

  // Build FAQ context
  const faqContext = FAQ_CATEGORIES.map((cat) =>
    `${cat.category}:\n${cat.questions.map((q) => `Q: ${q.q}\nA: ${q.a}`).join('\n')}`
  ).join('\n\n')

  const prompt = `You are the STRIDES ONE help assistant. An employee asked: "${question}"

Here are the FAQs for reference:
${faqContext}

If the question matches a FAQ, provide the answer in a helpful, conversational way (max 150 words). If it doesn't match, give a general helpful answer about using the portal. Be concise and friendly.`

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a helpful portal help assistant. Answer concisely and friendly.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })
    const answer = completion.choices[0]?.message?.content || 'I could not generate an answer.'
    return NextResponse.json({ answer })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI error', answer: 'The help AI is temporarily unavailable.' }, { status: 500 })
  }
}
