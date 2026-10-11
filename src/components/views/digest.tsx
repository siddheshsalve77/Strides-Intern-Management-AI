'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageHeader, MetricStrip, EmptyState, SectionCard, SectionLabel, StatusDot } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import {
  Calendar, CheckCircle2, Target, GraduationCap, Video, TrendingUp, Loader2, Sparkles, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { authedFetch } from '@/lib/firebase-auth'

interface DigestData {
  week: string
  summary: {
    attendance: { presentDays: number; lateDays: number; totalHours: number; avgHoursPerDay: number }
    tasks: { completed: number; inProgress: number; created: number; taskDetails: { title: string; status: string; project?: string }[] }
    goals: { active: number; completed: number; goalDetails: { title: string; progress: number }[] }
    learning: { coursesCompleted: number; courseDetails: { course: string; progress: number; status: string }[] }
    meetings: { upcoming: number; total: number }
    leaves: { pending: number; total: number }
    expenses: { total: number; amount: number }
  }
  highlights: string[]
}

export function DigestView() {
  const { currentEmployee } = useApp()
  const [data, setData] = useState<DigestData | null>(null)
  const [aiDigest, setAiDigest] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    if (!currentEmployee) return
    authedFetch(`/api/digest?employeeId=${currentEmployee.id}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [currentEmployee])

  async function generateAI() {
    if (!currentEmployee) return
    setAiLoading(true)
    try {
      const res = await authedFetch('/api/digest/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id }),
      })
      if (!res.ok) throw new Error()
      const { digest } = await res.json()
      setAiDigest(digest)
      setGenerated(true)
    } catch { toast.error('Failed to generate AI digest') }
    finally { setAiLoading(false) }
  }

  if (loading || !data) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>

  const s = data.summary

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Weekly Digest"
        description={`${data.week} · Your week at a glance`}
        actions={!generated && (
          <Button className="gap-2" onClick={generateAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate AI Digest
          </Button>
        )}
      />

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground p-5 shadow-card">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🌟</span>
              <SectionLabel className="text-primary-foreground/80">This Week&apos;s Highlights</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.highlights.map((h, i) => (
                <Badge key={i} variant="secondary" className="bg-white/15 text-white border-white/20 text-xs">{h}</Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Stats strip */}
      <MetricStrip
        metrics={[
          { label: 'Present Days', value: s.attendance.presentDays, sub: `${s.attendance.totalHours}h total`, tone: 'success' },
          { label: 'Tasks Done', value: s.tasks.completed, sub: `${s.tasks.inProgress} in progress`, tone: 'info' },
          { label: 'Meetings', value: s.meetings.total, sub: `${s.meetings.upcoming} upcoming` },
          { label: 'Avg Hours/Day', value: `${s.attendance.avgHoursPerDay}h`, sub: `${s.attendance.lateDays} late`, tone: 'warning' },
        ]}
      />

      {/* AI Digest */}
      {generated && aiDigest && (
        <SectionCard className="border-violet-500/30 bg-violet-500/5 shadow-card animate-rise">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-violet-500/15 text-violet-600 grid place-items-center"><Sparkles className="h-4 w-4" /></div>
              <div>
                <p className="font-semibold text-[13px]">AI Weekly Summary</p>
                <p className="text-[11px] text-muted-foreground">Generated by STRIDES AI</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 h-7" onClick={generateAI} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
            </Button>
          </div>
          <article className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-[13px] leading-relaxed">
            <ReactMarkdown>{aiDigest}</ReactMarkdown>
          </article>
        </SectionCard>
      )}

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Activity */}
        <SectionCard className="shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <SectionLabel>Task Activity</SectionLabel>
            <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{s.tasks.taskDetails.length} tasks</span>
          </div>
          {s.tasks.taskDetails.length > 0 ? (
            <div className="space-y-1">
              {s.tasks.taskDetails.slice(0, 5).map((t, i) => (
                <div key={i} className="compact-row">
                  <StatusDot tone={t.status === 'COMPLETED' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'neutral'} />
                  <span className="flex-1 text-[12px] truncate">{t.title}</span>
                  <Badge variant="outline" className="text-[10px] border-0">{t.status.replace(/_/g, ' ').toLowerCase()}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-muted-foreground">No task activity this week</p>}
        </SectionCard>

        {/* Goals Progress */}
        <SectionCard className="shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <SectionLabel>Goals Progress</SectionLabel>
            <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{s.goals.goalDetails.length} active</span>
          </div>
          {s.goals.goalDetails.length > 0 ? (
            <div className="space-y-3">
              {s.goals.goalDetails.slice(0, 4).map((g, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-medium truncate">{g.title}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{g.progress}%</span>
                  </div>
                  <Progress value={g.progress} className="h-1" />
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-muted-foreground">No active goals</p>}
        </SectionCard>

        {/* Learning Progress */}
        <SectionCard className="shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-rose-600" />
            <SectionLabel>Learning Progress</SectionLabel>
            <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{s.learning.courseDetails.length} courses</span>
          </div>
          {s.learning.courseDetails.length > 0 ? (
            <div className="space-y-1">
              {s.learning.courseDetails.slice(0, 4).map((l, i) => (
                <div key={i} className="compact-row">
                  <StatusDot tone={l.status === 'COMPLETED' ? 'success' : 'warning'} />
                  <span className="flex-1 text-[12px] truncate">{l.course}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{l.progress}%</span>
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-muted-foreground">No learning activity</p>}
        </SectionCard>

        {/* Meetings */}
        <SectionCard className="shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Video className="h-4 w-4 text-violet-600" />
            <SectionLabel>Meetings</SectionLabel>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg surface-sunken p-3">
              <p className="text-[22px] font-bold text-violet-600 tabular-nums leading-none">{s.meetings.total}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Total this week</p>
            </div>
            <div className="rounded-lg surface-sunken p-3">
              <p className="text-[22px] font-bold text-emerald-600 tabular-nums leading-none">{s.meetings.upcoming}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Upcoming</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
