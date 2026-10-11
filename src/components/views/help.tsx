'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PageHeader, EmptyState, RowSkeleton, SectionLabel, Kbd } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import {
  Search, LifeBuoy, ChevronDown, ChevronRight, Bot, Loader2, Send, Sparkles,
  HelpCircle, BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { authedFetch } from '@/lib/firebase-auth'

interface FAQItem { q: string; a: string }
interface FAQCategory { category: string; icon: string; questions: FAQItem[] }

export function HelpView() {
  const [categories, setCategories] = useState<FAQCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    authedFetch('/api/help').then((r) => r.json()).then((c) => { setCategories(Array.isArray(c) ? c : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function askAI() {
    if (!aiQuestion.trim()) return
    setAiLoading(true)
    setAiAnswer('')
    try {
      const res = await authedFetch('/api/help/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion }),
      })
      if (!res.ok) throw new Error()
      const { answer } = await res.json()
      setAiAnswer(answer)
    } catch { toast.error('AI help unavailable') }
    finally { setAiLoading(false) }
  }

  const filtered = categories.map((c) => ({
    ...c,
    questions: c.questions.filter((q) =>
      !search || q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((c) => c.questions.length > 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Help & Support" description="Find answers and get AI-powered help" />

      {/* AI Help */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 to-primary text-white p-5 shadow-card">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-xl bg-white/15 grid place-items-center"><Bot className="h-4 w-4" /></div>
            <div>
              <p className="font-semibold text-[14px] flex items-center gap-1.5">Ask AI Help <Badge variant="secondary" className="bg-white/15 text-white border-white/20 text-[9px] gap-1"><Sparkles className="h-2.5 w-2.5" /> Beta</Badge></p>
              <p className="text-[11px] text-white/70">Get instant answers about using the portal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading) askAI() }}
              placeholder="e.g., How do I apply for leave?"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
            <Button onClick={askAI} disabled={aiLoading || !aiQuestion.trim()} variant="secondary" className="gap-2 shrink-0">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {aiAnswer && (
            <Card className="mt-3 p-3 bg-white/10 border-white/20 text-white">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                <div className="prose prose-sm dark:prose-invert max-w-none text-white text-[12px] leading-relaxed">
                  <ReactMarkdown>{aiAnswer}</ReactMarkdown>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQs…" className="pl-9 shadow-card" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
          <Kbd>/</Kbd> to focus
        </div>
      </div>

      {/* FAQ */}
      {loading ? (
        <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={5} /></div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={HelpCircle} title="No results" description={search ? `No FAQs match "${search}"` : 'No FAQs available'} /></Card>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          {filtered.map((cat, ci) => (
            <div key={cat.category} className={cn(ci > 0 && 'border-t border-border')}>
              <div className="flex items-center gap-2 px-4 py-2.5 surface-sunken">
                <span className="text-base">{cat.icon}</span>
                <SectionLabel>{cat.category}</SectionLabel>
                <Badge variant="outline" className="text-[10px] border-0 ml-auto tabular-nums">{cat.questions.length}</Badge>
              </div>
              <div className="divide-y divide-border">
                {cat.questions.map((q, i) => {
                  const key = `${cat.category}-${i}`
                  const isOpen = expanded === key
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : key)}
                        className="compact-row w-full text-left"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-[13px] font-medium flex-1 truncate">{q.q}</span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3 pl-10 text-[12px] text-muted-foreground leading-relaxed animate-rise text-pretty">
                          {q.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Support contact */}
      <Card className="p-4 surface-tinted shadow-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0"><LifeBuoy className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[13px]">Need more help?</p>
            <p className="text-[11px] text-muted-foreground">Raise a service request and our team will assist you.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => useApp.getState().setView('requests')}>
            <BookOpen className="h-3.5 w-3.5" /> Contact Support
          </Button>
        </div>
      </Card>
    </div>
  )
}
