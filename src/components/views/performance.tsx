'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageHeader, SectionLabel } from '@/components/portal/ui-helpers'
import { PerformanceRadarChart } from '@/components/portal/charts'
import { TrendingUp, Target, CheckCircle2, Award, Gauge, Star, Sparkles, Flag, ArrowUpRight } from 'lucide-react'
import type { PerformanceT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

export function PerformanceView() {
  const { currentEmployee } = useApp()
  const [perf, setPerf] = useState<PerformanceT | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentEmployee) return
    authedFetch(`/api/performance?employeeId=${currentEmployee.id}`).then((r) => r.json()).then((arr) => { setPerf(arr[0] || null); setLoading(false) })
  }, [currentEmployee])

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div>

  const metrics = perf ? [
    { label: 'Overall', value: perf.overall, icon: TrendingUp },
    { label: 'Goal Achievement', value: perf.goalAchievement, icon: Target },
    { label: 'Task Completion', value: perf.taskCompletion, icon: CheckCircle2 },
    { label: 'Quality', value: perf.quality, icon: Award },
    { label: 'Attendance', value: perf.attendance, icon: Gauge },
    { label: 'Manager Rating', value: perf.managerRating, icon: Star },
  ] : []

  const toneFor = (v: number): 'success' | 'info' | 'warning' | 'danger' =>
    v >= 85 ? 'success' : v >= 70 ? 'info' : v >= 50 ? 'warning' : 'danger'

  return (
    <div className="space-y-6">
      <PageHeader title="Performance" description={perf ? `${perf.period} review` : 'Your performance summary'} />

      {/* Overall score hero */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground p-6 lg:p-8 animate-rise">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <SectionLabel className="text-primary-foreground/70 mb-2">Overall Performance</SectionLabel>
            <div className="flex items-end gap-2">
              <p className="text-6xl font-bold tracking-tight tabular-nums leading-none">{perf?.overall ?? '—'}</p>
              <p className="text-2xl mb-1 text-primary-foreground/70 tabular-nums">%</p>
            </div>
            <Badge variant="secondary" className="mt-3 bg-white/15 text-white border-white/20 gap-1">
              <Sparkles className="h-3 w-3" />
              {perf?.period || 'No review yet'}
            </Badge>
          </div>
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/20" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${perf?.overall || 0}, 100`} strokeLinecap="round" className="text-white" />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{perf?.overall ?? '—'}</p>
                <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wide">Score</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Score breakdown — growth story style */}
      <Card className="p-4 animate-rise">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-semibold">Score Breakdown</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Six dimensions of your performance</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {metrics.map((m) => {
            const Icon = m.icon
            const tone = toneFor(m.value)
            const toneClass =
              tone === 'success' ? 'text-emerald-600' :
              tone === 'info' ? 'text-sky-600' :
              tone === 'warning' ? 'text-amber-600' : 'text-rose-600'
            return (
              <div key={m.label} className="flex items-center gap-3 py-1">
                <div className="h-7 w-7 rounded-lg bg-muted grid place-items-center shrink-0">
                  <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-medium">{m.label}</p>
                    <p className="text-[12px] font-bold tabular-nums">{m.value}%</p>
                  </div>
                  <Progress value={m.value} className="h-1.5" />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Radar chart + Manager summary */}
      {perf && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-rise">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] font-semibold">Performance Radar</p>
              <Badge variant="outline" className="text-[10px] gap-1"><Target className="h-3 w-3" />multi-dim</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">Multi-dimensional score breakdown</p>
            <PerformanceRadarChart data={perf} />
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold">Manager Summary</p>
              <Badge variant="outline" className="text-[10px] gap-1"><Star className="h-3 w-3" />{perf.period}</Badge>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{perf.summary}</p>
            <div className="mt-4 pt-4 border-t space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-600 grid place-items-center shrink-0 mt-0.5"><ArrowUpRight className="h-3 w-3" /></div>
                <div className="min-w-0">
                  <SectionLabel>Strengths</SectionLabel>
                  <p className="text-[12px] mt-0.5">Task ownership, collaboration, on-time delivery</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-md bg-amber-500/10 text-amber-600 grid place-items-center shrink-0 mt-0.5"><Flag className="h-3 w-3" /></div>
                <div className="min-w-0">
                  <SectionLabel>Focus areas</SectionLabel>
                  <p className="text-[12px] mt-0.5">Estimation accuracy, technical depth</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Development areas — timeline of growth targets */}
      <Card className="p-4 animate-rise">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-semibold">Development Areas & Recommendations</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Growth targets for the next cycle</p>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1"><Sparkles className="h-3 w-3" />growth plan</Badge>
        </div>
        <div className="space-y-2.5">
          {[
            { area: 'Technical Depth', note: 'Continue building expertise in system design', level: 82 },
            { area: 'Communication', note: 'Lead at least one tech talk this quarter', level: 78 },
            { area: 'Leadership', note: 'Mentor a junior team member', level: 75 },
            { area: 'Delivery', note: 'Improve estimation accuracy', level: 88 },
          ].map((d) => {
            const tone = toneFor(d.level)
            const toneClass =
              tone === 'success' ? 'text-emerald-600' :
              tone === 'info' ? 'text-sky-600' :
              tone === 'warning' ? 'text-amber-600' : 'text-rose-600'
            return (
              <div key={d.area} className="compact-row">
                <div className="min-w-0 w-40 shrink-0">
                  <p className="text-[12px] font-medium leading-tight truncate">{d.area}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{d.note}</p>
                </div>
                <div className="flex-1 min-w-0"><Progress value={d.level} className="h-2" /></div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`status-dot status-dot-${tone}`} />
                  <span className={`text-[12px] font-semibold tabular-nums w-10 text-right ${toneClass}`}>{d.level}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
