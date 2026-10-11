'use client'

import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader, Kbd } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'
import { Bot, Send, Sparkles, Loader2, Lightbulb, ListChecks, CalendarDays, FileText, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface Msg { role: 'user' | 'assistant'; content: string; ts: string }

const suggestions = [
  { icon: ListChecks, text: 'What tasks do I have due this week?', color: 'text-sky-600 bg-sky-500/10' },
  { icon: TrendingUp, text: 'Summarize my pending work and what to prioritize today', color: 'text-emerald-600 bg-emerald-500/10' },
  { icon: CalendarDays, text: 'How much leave balance do I have?', color: 'text-amber-600 bg-amber-500/10' },
  { icon: FileText, text: 'Explain the company leave policy', color: 'text-violet-600 bg-violet-500/10' },
  { icon: Lightbulb, text: 'Help me draft a leave request for a family function', color: 'text-rose-600 bg-rose-500/10' },
  { icon: TrendingUp, text: 'Summarize my performance this quarter', color: 'text-teal-600 bg-teal-500/10' },
]

export function AIAssistantView() {
  const { currentEmployee } = useApp()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const message = (text || input).trim()
    if (!message || !currentEmployee) return
    const userMsg: Msg = { role: 'user', content: message, ts: new Date().toISOString() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await authedFetch('/api/ai/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, message }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, ts: new Date().toISOString() }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not process that right now. Please try again.', ts: new Date().toISOString() }])
      toast.error('AI request failed')
    } finally { setLoading(false) }
  }

  if (!currentEmployee) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="STRIDES AI Assistant"
        description="Your intelligent work assistant — tasks, leave, performance, policies & more."
        actions={
          <Badge variant="outline" className="text-[10px] gap-1 border-0 bg-violet-500/15 text-violet-600">
            <Sparkles className="h-3 w-3" /> Beta
          </Badge>
        }
      />

      {/* Chat card — premium AI glass identity */}
      <Card className="relative flex flex-col h-[62vh] min-h-[440px] overflow-hidden shadow-card border-violet-500/20 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-violet-500/[0.05]">
        {/* Gradient hairline — AI signature */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, oklch(0.6 0.16 250 / 0.6), transparent)' }} aria-hidden />
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 surface-sunken">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="h-14 w-14 rounded-2xl grid place-items-center mb-3 text-white" style={{ background: 'var(--gradient-ai)', boxShadow: '0 1px 0 oklch(1 0 0 / 0.25) inset, 0 8px 24px oklch(0.55 0.16 250 / 0.35)' }}>
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="font-semibold text-[15px]">Ask me anything about your work</p>
              <p className="text-[12px] text-muted-foreground mt-1 max-w-md text-pretty">I have access to your tasks, leave balance, performance, learning and company policies.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-2xl">
                {suggestions.map((s) => {
                  const Icon = s.icon
                  return (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left hover:bg-accent hover:border-primary/30 hover:-translate-y-px hover:shadow-card transition-all duration-200 press-tactile shadow-card"
                    >
                      <div className={cn('h-7 w-7 rounded-lg grid place-items-center shrink-0', s.color)}><Icon className="h-3.5 w-3.5" /></div>
                      <span className="text-[12px] text-foreground/90 text-pretty">{s.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2.5 animate-rise', m.role === 'user' && 'flex-row-reverse')}>
              <Avatar className="h-7 w-7 shrink-0">
                {m.role === 'user' ? (
                  <>
                    <AvatarImage src={currentEmployee.photoUrl} />
                    <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials(currentEmployee.name)}</AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="text-white" style={{ background: 'var(--gradient-ai)' }}><Bot className="h-3.5 w-3.5" /></AvatarFallback>
                )}
              </Avatar>
              <div className={cn(
                'max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                m.role === 'user'
                  ? 'text-white rounded-tr-sm'
                  : 'bg-card border border-border rounded-tl-sm shadow-card'
              )} style={m.role === 'user' ? { background: 'var(--gradient-primary)' } : undefined}>
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 animate-rise">
              <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-white" style={{ background: 'var(--gradient-ai)' }}><Bot className="h-3.5 w-3.5" /></AvatarFallback></Avatar>
              <div className="bg-card border border-border rounded-xl rounded-tl-sm px-4 py-3 shadow-card">
                <span className="ai-thinking" aria-label="AI is thinking"><span /><span /><span /></span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex items-center gap-2 bg-card">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask STRIDES AI…"
            disabled={loading}
            className="flex-1"
          />
          <Button variant="ai" onClick={() => send()} disabled={loading || !input.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
        <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> send · <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> newline
          </span>
          <span className="hidden sm:inline">AI assists — your manager decides.</span>
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        AI responses are generated and may contain inaccuracies. Verify critical information.
      </p>
    </div>
  )
}
