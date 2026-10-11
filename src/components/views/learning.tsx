'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader, EmptyState, MetricStrip, SectionLabel, RowSkeleton } from '@/components/portal/ui-helpers'
import { GraduationCap, CheckCircle2, BookOpen, PlayCircle, Loader2, Award } from 'lucide-react'
import { toast } from 'sonner'
import type { LearningT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const categoryTint: Record<string, string> = {
  TECHNICAL: 'bg-sky-500/10 text-sky-600',
  LEADERSHIP: 'bg-violet-500/10 text-violet-600',
  COMPLIANCE: 'bg-amber-500/10 text-amber-600',
  SOFT_SKILLS: 'bg-emerald-500/10 text-emerald-600',
  ONBOARDING: 'bg-teal-500/10 text-teal-600',
  CERTIFICATION: 'bg-rose-500/10 text-rose-600',
}

export function LearningView() {
  const { currentEmployee } = useApp()
  const [courses, setCourses] = useState<LearningT[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    if (!currentEmployee) return
    try {
      const c = await authedFetch(`/api/learning?employeeId=${currentEmployee.id}`).then((r) => r.json())
      setCourses(Array.isArray(c) ? c : [])
    } catch {
      setCourses([])
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [currentEmployee])

  async function updateProgress(id: string, progress: number) {
    setUpdating(id)
    await authedFetch('/api/learning', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, progress }) })
    toast.success(progress >= 100 ? 'Course completed! 🎉' : 'Progress updated')
    load(); setUpdating(null)
  }

  const completed = courses.filter((c) => c.status === 'COMPLETED').length
  const inProgress = courses.filter((c) => c.status === 'IN_PROGRESS').length
  const avgProgress = courses.length ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / courses.length) : 0

  // Category chips (informational, derived from data)
  const categoryCounts: Record<string, number> = {}
  courses.forEach((c) => { categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1 })
  const categoryChips = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      <PageHeader title="Learning & Development" description="Courses, training and certifications" />

      {/* Stats — MetricStrip */}
      <div className="animate-rise">
        <MetricStrip
          metrics={[
            { label: 'Total Courses', value: courses.length, sub: 'assigned to you', tone: 'default' },
            { label: 'Completed', value: completed, sub: 'finished tracks', tone: 'success' },
            { label: 'In Progress', value: inProgress, sub: 'currently studying', tone: 'warning' },
            { label: 'Avg Progress', value: `${avgProgress}%`, sub: 'across all courses', tone: 'info' },
          ]}
        />
      </div>

      {/* Category chips */}
      {categoryChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap animate-rise animate-rise-delay-1">
          <SectionLabel className="mr-1">Categories</SectionLabel>
          {categoryChips.map(([cat, count]) => {
            const tint = categoryTint[cat] || 'bg-muted text-muted-foreground'
            return (
              <span key={cat} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tabular-nums ${tint}`}>
                <span className="uppercase tracking-wide">{cat.replace('_', ' ')}</span>
                <span className="opacity-70">{count}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Course list — compact rows with progress bars */}
      {loading ? (
        <Card className="p-3 shadow-card"><RowSkeleton count={6} /></Card>
      ) : courses.length === 0 ? (
        <Card><EmptyState icon={GraduationCap} title="No courses assigned" description="Your training will appear here." /></Card>
      ) : (
        <Card className="shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold">My Courses</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Track progress and complete training</p>
            </div>
            <Badge variant="outline" className="text-[10px] tabular-nums">{courses.length} total</Badge>
          </div>
          <div className="p-2 max-h-[32rem] overflow-y-auto scrollbar-thin">
            {courses.map((c, i) => {
              const tint = categoryTint[c.category] || 'bg-muted text-muted-foreground'
              const isCompleted = c.status === 'COMPLETED'
              return (
                <div
                  key={c.id}
                  className="compact-row !items-stretch !py-3 flex-col sm:flex-row animate-rise"
                  style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                      {isCompleted ? <Award className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold leading-snug truncate">{c.courseName}</p>
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${tint}`}>
                          {c.category.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[80px]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${c.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold tabular-nums shrink-0">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {c.progress}%</span>
                          ) : (
                            `${c.progress}%`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 sm:ml-2 mt-2 sm:mt-0">
                    {!isCompleted && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px]" disabled={updating === c.id} onClick={() => updateProgress(c.id, Math.min(100, c.progress + 20))}>
                          {updating === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />} +20%
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px]" onClick={() => updateProgress(c.id, 100)}>
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
