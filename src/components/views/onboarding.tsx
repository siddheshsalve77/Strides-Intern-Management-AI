'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader, EmptyState, MetricStrip, SectionCard, SectionLabel } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { fmtDate, initials } from '@/lib/format'
import { ClipboardCheck, CheckCircle2, Circle, Loader2, PartyPopper, UserPlus, FileText, Laptop, GraduationCap, Users, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { OnboardingTaskT, EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const categoryConfig: Record<string, { icon: any; color: string }> = {
  DOCUMENTS: { icon: FileText, color: 'bg-violet-500/10 text-violet-600' },
  IT: { icon: Laptop, color: 'bg-sky-500/10 text-sky-600' },
  HR: { icon: Users, color: 'bg-emerald-500/10 text-emerald-600' },
  TRAINING: { icon: GraduationCap, color: 'bg-rose-500/10 text-rose-600' },
  INTRO: { icon: UserPlus, color: 'bg-amber-500/10 text-amber-600' },
  GENERAL: { icon: ClipboardCheck, color: 'bg-primary/10 text-primary' },
}

interface GroupedOnboarding {
  employee: EmployeeT
  tasks: OnboardingTaskT[]
  completed: number
  total: number
}

export function OnboardingView() {
  const { currentEmployee } = useApp()
  const [tasks, setTasks] = useState<OnboardingTaskT[]>([])
  const [grouped, setGrouped] = useState<GroupedOnboarding[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const isHRorAdmin = currentEmployee && ['HR', 'ADMIN'].includes(currentEmployee.role)

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    try {
      if (isHRorAdmin) {
        const g = await authedFetch('/api/onboarding?scope=all').then((r) => r.json())
        setGrouped(Array.isArray(g) ? g : [])
      } else {
        const t = await authedFetch(`/api/onboarding?employeeId=${currentEmployee.id}`).then((r) => r.json())
        setTasks(Array.isArray(t) ? t : [])
      }
    } catch {
      if (isHRorAdmin) setGrouped([]); else setTasks([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function toggle(id: string, completed: boolean) {
    setUpdating(id)
    try {
      await authedFetch(`/api/onboarding/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      toast.success(completed ? 'Step completed! 🎉' : 'Step reopened')
      load()
    } catch { toast.error('Failed') } finally { setUpdating(null) }
  }

  const completed = tasks.filter((t) => t.completed).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = total > 0 && completed === total
  const firstPendingIdx = tasks.findIndex((t) => !t.completed)

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Onboarding" description={isHRorAdmin ? 'Track onboarding progress across all new hires' : 'Complete your onboarding checklist'} />

      {!isHRorAdmin ? (
        <>
          {/* Progress hero */}
          <Card className={`relative overflow-hidden border-0 p-6 shadow-card ${allDone ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-primary to-emerald-700'} text-primary-foreground`}>
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
              <div>
                {allDone ? (
                  <>
                    <div className="flex items-center gap-2 mb-1"><PartyPopper className="h-5 w-5" /><p className="text-sm font-medium">Onboarding Complete!</p></div>
                    <h2 className="text-3xl font-bold tracking-tight">You're all set, {currentEmployee?.name.split(' ')[0]}! 🎉</h2>
                    <p className="text-sm text-primary-foreground/80 mt-1">Welcome to the team. You can now access all portal features.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-primary-foreground/80 mb-1">Onboarding Progress</p>
                    <h2 className="text-3xl font-bold tracking-tight tabular-nums">{pct}% Complete</h2>
                    <p className="text-sm text-primary-foreground/80 mt-1 tabular-nums">{completed} of {total} steps completed · {total - completed} remaining</p>
                  </>
                )}
              </div>
              {!allDone && (
                <div className="relative h-24 w-24">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/20" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" className="text-white" />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center"><p className="text-xl font-bold tabular-nums">{pct}%</p></div>
                </div>
              )}
            </div>
            {!allDone && <Progress value={pct} className="h-1.5 mt-4 bg-white/20 relative z-10 [&>div]:bg-white" />}
          </Card>

          {/* Checklist timeline */}
          {tasks.length === 0 ? (
            <Card className="shadow-card"><EmptyState icon={ClipboardCheck} title="No onboarding tasks" description="Your onboarding checklist will appear here." /></Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, i) => {
                const cfg = categoryConfig[task.category] || categoryConfig.GENERAL
                const Icon = cfg.icon
                const isNow = i === firstPendingIdx
                return (
                  <div key={task.id} className="timeline-rail animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
                    <button
                      onClick={() => toggle(task.id, !task.completed)}
                      disabled={updating === task.id}
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                      className={cn(
                        'absolute left-0 top-1 z-10 h-[11px] w-[11px] rounded-full border-2 grid place-items-center transition-all duration-200',
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_0_3px_oklch(0.6_0.12_155/0.12)]'
                          : isNow
                            ? 'bg-amber-500 border-amber-500 shadow-[0_0_0_3px_oklch(0.7_0.13_70/0.12)]'
                            : 'bg-card border-primary shadow-[0_0_0_3px_oklch(0.45_0.09_178/0.08)] hover:scale-110'
                      )}
                    >
                      {updating === task.id ? <Loader2 className="h-2 w-2 animate-spin text-white" /> : null}
                    </button>
                    <div className="flex items-start gap-3">
                      <div className={cn('h-8 w-8 rounded-lg grid place-items-center shrink-0 transition-opacity', cfg.color, task.completed && 'opacity-60')}><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('font-medium text-[13px] leading-tight', task.completed && 'line-through text-muted-foreground')}>{task.title}</p>
                          <Badge variant="outline" className="text-[10px] border-0">{task.category}</Badge>
                          {isNow && !task.completed && <Badge variant="outline" className="text-[10px] border-0 bg-amber-500/15 text-amber-600">Up next</Badge>}
                        </div>
                        {task.description && <p className="text-[11px] text-muted-foreground mt-0.5">{task.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                          {task.dueDate && <span>Due {fmtDate(task.dueDate, 'd MMM')}</span>}
                          {task.completedAt && <span className="text-emerald-600">✓ Completed {fmtDate(task.completedAt, 'd MMM')}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        // HR/Admin view — all employees
        <>
          <MetricStrip
            metrics={[
              { label: 'New Hires', value: grouped.length, sub: 'in onboarding' },
              { label: 'Completed', value: grouped.filter((g) => g.completed === g.total).length, sub: 'fully onboarded', tone: 'success' },
              { label: 'In Progress', value: grouped.filter((g) => g.completed < g.total).length, sub: 'active', tone: 'warning' },
              { label: 'Avg Progress', value: grouped.length ? `${Math.round(grouped.reduce((s, g) => s + (g.completed / g.total) * 100, 0) / grouped.length)}%` : '—', sub: 'across all hires', tone: 'info' },
            ]}
          />

          {grouped.length === 0 ? (
            <Card className="shadow-card"><EmptyState icon={ClipboardCheck} title="No onboarding in progress" /></Card>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => {
                const pct = Math.round((g.completed / g.total) * 100)
                const allDone = g.completed === g.total
                const firstPendingIdx = Array.isArray(g.tasks) ? g.tasks.findIndex((t) => !t.completed) : -1
                return (
                  <SectionCard key={g.employee.id} className="shadow-card animate-rise">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 shrink-0"><AvatarImage src={g.employee.photoUrl} /><AvatarFallback className="bg-primary/15 text-primary text-[11px]">{initials(g.employee.name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[13px] leading-tight">{g.employee.name}</p>
                          <Badge variant="outline" className="text-[10px] border-0">{g.employee.role}</Badge>
                          {allDone && <Badge variant="outline" className="text-[10px] border-0 bg-emerald-500/15 text-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Complete</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{g.employee.designation} · {g.employee.department}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold tabular-nums leading-none">{pct}%</p>
                        <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{g.completed}/{g.total} steps</p>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1 mb-3" />
                    <div className="space-y-1">
                      {g.tasks.map((t, i) => {
                        const cfg = categoryConfig[t.category] || categoryConfig.GENERAL
                        const Icon = cfg.icon
                        const isNow = i === firstPendingIdx
                        return (
                          <div key={t.id} className="compact-row">
                            {t.completed ? (
                              <span className="status-dot status-dot-success shrink-0" />
                            ) : isNow ? (
                              <span className="status-dot status-dot-warning shrink-0" />
                            ) : (
                              <span className="status-dot status-dot-neutral shrink-0" />
                            )}
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', cfg.color.split(' ')[1])} />
                            <span className={cn('text-[12px] truncate flex-1', t.completed && 'line-through text-muted-foreground')}>{t.title}</span>
                            {t.completed && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                          </div>
                        )
                      })}
                    </div>
                  </SectionCard>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
