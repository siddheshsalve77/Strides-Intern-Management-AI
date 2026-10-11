'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { greeting, fmtDate, fmtTime, fmtRelative, initials, taskColor, taskLabel, daysUntil } from '@/lib/format'
import { useTheme } from 'next-themes'
import type { TaskT, AnnouncementT, NotificationT, AttendanceT, HolidayT, LeaveBalanceT, GoalT, MeetingT } from '@/lib/types'
import {
  Clock, CalendarDays, ListChecks, TrendingUp, Play, Square, Megaphone,
  ArrowRight, Sparkles, Coffee, CheckCircle2, ChevronRight, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { authedFetch } from '@/lib/firebase-auth'
import {
  MetricStrip, Timeline, CompactRow, SectionLabel,
  StatCard, EmptyState, SectionCard, ProgressBar, Pill,
} from '@/components/portal/ui-helpers'

interface AnalyticsData {
  attendanceTrend: { date: string; hours: number; status: string; label: string }[]
  taskDistribution: Record<string, number>
  avgWeekdayHours: number[]
  totalTasks?: number
  completedTasks?: number
}

export function DashboardView() {
  const { currentEmployee, setView, dataVersion } = useApp()
  const { theme } = useTheme()
  const [tasks, setTasks] = useState<TaskT[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementT[]>([])
  const [notifs, setNotifs] = useState<NotificationT[]>([])
  const [todayAtt, setTodayAtt] = useState<AttendanceT | null>(null)
  const [upcomingHolidays, setUpcomingHolidays] = useState<HolidayT[]>([])
  const [balance, setBalance] = useState<LeaveBalanceT | null>(null)
  const [goals, setGoals] = useState<GoalT[]>([])
  const [meetings, setMeetings] = useState<MeetingT[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)

  useEffect(() => {
    if (!currentEmployee?.id) return
    const uid = currentEmployee.id
    const controller = new AbortController()

    setLoading(true)

    Promise.all([
      authedFetch(`/api/tasks?assigneeId=${uid}`, { signal: controller.signal }).then((r) => r.json()).catch(() => []),
      authedFetch('/api/announcements', { signal: controller.signal }).then((r) => r.json()).catch(() => []),
      authedFetch(`/api/notifications?employeeId=${uid}`, { signal: controller.signal }).then((r) => r.json()).catch(() => []),
      authedFetch(`/api/attendance?employeeId=${uid}&limit=1`, { signal: controller.signal }).then((r) => r.json()).catch(() => []),
      authedFetch('/api/holidays?upcoming=true', { signal: controller.signal }).then((r) => r.json()).catch(() => []),
      authedFetch(`/api/leave/balance?employeeId=${uid}`, { signal: controller.signal }).then((r) => r.json()).catch(() => null),
      authedFetch(`/api/analytics?employeeId=${uid}`, { signal: controller.signal }).then((r) => r.json()).catch(() => null),
      authedFetch(`/api/goals?employeeId=${uid}`, { signal: controller.signal }).then((r) => r.json()).catch(() => []),
      authedFetch(`/api/meetings?employeeId=${uid}`, { signal: controller.signal }).then((r) => r.json()).catch(() => []),
    ]).then(([t, a, n, att, h, b, an, g, m]) => {
      const currentUid = useApp.getState().currentEmployee?.id
      if (currentUid !== uid) return

      setTasks(t || []); setAnnouncements(a || []); setNotifs(n || []); setTodayAtt(Array.isArray(att) ? att[0] || null : null); setUpcomingHolidays(h || []); setBalance(b || null); if (an) setAnalytics(an); setGoals(g || []); setMeetings(m || [])
    }).finally(() => {
      const currentUid = useApp.getState().currentEmployee?.id
      if (currentUid === uid) setLoading(false)
    })

    return () => controller.abort()
  }, [currentEmployee?.id, dataVersion])

  async function clock(action: 'CHECK_IN' | 'CHECK_OUT') {
    if (!currentEmployee) return
    setClocking(true)
    try {
      const res = await authedFetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, action }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const rec = await res.json()
      setTodayAtt(rec)
      toast.success(action === 'CHECK_IN' ? 'Checked in' : 'Checked out')
    } catch (e: any) { toast.error(e.message || 'Action failed') }
    finally { setClocking(false) }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-32 rounded-xl card-premium overflow-hidden border-0">
          <div className="h-full w-full skeleton-premium" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg card-premium p-4 border-0">
              <div className="h-3 w-20 skeleton-premium mb-2" />
              <div className="h-6 w-16 skeleton-premium" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg card-premium p-4 border-0">
              <div className="h-full w-full skeleton-premium opacity-50" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!currentEmployee) return null
  const emp = currentEmployee
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS')
  const pending = tasks.filter((t) => !['COMPLETED', 'APPROVED'].includes(t.status))
  const dueSoon = tasks.filter((t) => {
    if (!t.deadline) return false
    const d = daysUntil(t.deadline)
    return d !== null && d >= 0 && d <= 3 && !['COMPLETED', 'APPROVED'].includes(t.status)
  })
  const overdue = tasks.filter((t) => {
    if (!t.deadline) return false
    const d = daysUntil(t.deadline)
    return d !== null && d < 0 && !['COMPLETED', 'APPROVED'].includes(t.status)
  })
  const isCheckedIn = !!todayAtt?.checkIn && !todayAtt?.checkOut
  const isCheckedOut = !!todayAtt?.checkOut
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6
  const todayMeetings = meetings.filter((m) => new Date(m.startTime).toDateString() === new Date().toDateString())
  const totalLeave = balance ? balance.casualLeave + balance.sickLeave + balance.earnedLeave : 0
  const completedPct = analytics && analytics.totalTasks ? Math.round((analytics.completedTasks! / analytics.totalTasks) * 100) : 0

  // Calculate working duration
  const workingHours = isCheckedIn && todayAtt?.checkIn
    ? ((Date.now() - new Date(todayAtt.checkIn).getTime()) / 3600000)
    : todayAtt?.workHours || 0

  return (
    <div className="space-y-5">
      {/* ============================================================
          HERO — Premium card-hero with ambient depth orbs
          ============================================================ */}
      <div className="relative card-hero overflow-hidden animate-fade-in-up">
        {/* Ambient orbs for depth */}
        <div className="orb-teal absolute -top-16 -right-10 h-44 w-44 opacity-50 blur-2xl pointer-events-none" />
        <div className="orb-blue absolute -bottom-20 left-1/4 h-36 w-36 opacity-30 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />

        <div className="relative z-10 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Identity */}
          <div className="flex items-center gap-3.5">
            <Avatar className="h-12 w-12 ring-2 ring-white/20">
              <AvatarImage src={emp.photoUrl} alt={emp.name} />
              <AvatarFallback className="bg-white/15 text-white font-semibold">{initials(emp.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[12px] text-white/70">{greeting()},</p>
              <h2 className="text-[22px] font-bold tracking-tight leading-tight text-white">{emp.name.split(' ')[0]}</h2>
              <p className="text-[12px] text-white/70 mt-0.5">
                {emp.designation} · {emp.department} · {fmtDate(new Date(), 'EEE, d MMM')}
              </p>
            </div>
          </div>

          {/* Right: Attendance state + action */}
          <div className="flex items-center gap-3 shrink-0">
            {!isWeekend && !isCheckedIn && !isCheckedOut && (
              <button
                onClick={() => clock('CHECK_IN')}
                disabled={clocking}
                className="press-tactile flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2 text-[13px] font-semibold text-teal-700 hover:bg-white transition-colors disabled:opacity-50 shadow-pop"
              >
                <Play className="h-3.5 w-3.5" /> Check In
              </button>
            )}
            {!isWeekend && isCheckedIn && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[12px] font-medium text-emerald-200">Clocked in</span>
                  </div>
                  <p className="text-[11px] text-white/60">
                    {todayAtt?.checkIn ? `Since ${fmtTime(todayAtt.checkIn)}` : ''} · {workingHours.toFixed(1)}h
                  </p>
                </div>
                <button
                  onClick={() => clock('CHECK_OUT')}
                  disabled={clocking}
                  className="press-tactile flex items-center gap-1.5 rounded-lg border border-rose-200/30 bg-rose-500/15 px-3.5 py-2 text-[13px] font-medium text-rose-100 hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                >
                  <Square className="h-3 w-3" /> Check Out
                </button>
              </div>
            )}
            {!isWeekend && isCheckedOut && (
              <div className="flex items-center gap-2 text-right">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-[12px] font-medium text-emerald-200">Day complete</p>
                  <p className="text-[11px] text-white/60">{todayAtt?.workHours?.toFixed(1)}h logged</p>
                </div>
              </div>
            )}
            {isWeekend && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50/90 dark:bg-amber-500/15 px-3 py-2 ring-1 ring-amber-400/30 shadow-pop">
                <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[12px] font-medium text-amber-700 dark:text-amber-200">Weekend</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          KPI CARDS — Varied accent tones for semantic meaning
          emerald = attendance · amber = leave · violet = tasks · teal = completion
          ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-rise">
        <StatCard
          label="Today"
          value={(isCheckedIn || isCheckedOut) ? `${workingHours.toFixed(1)}h` : '—'}
          sub={isWeekend ? 'Weekend' : isCheckedOut ? 'Checked out' : isCheckedIn ? 'Clocked in' : 'Not checked in'}
          icon={Clock}
          accent="emerald"
        />
        <StatCard
          label="Leave"
          value={totalLeave}
          sub={`C ${balance?.casualLeave ?? 0} · S ${balance?.sickLeave ?? 0} · E ${balance?.earnedLeave ?? 0}`}
          icon={CalendarDays}
          accent="amber"
        />
        <StatCard
          label="Tasks"
          value={pending.length}
          sub={overdue.length > 0 ? `${overdue.length} overdue` : dueSoon.length > 0 ? `${dueSoon.length} due soon` : 'All on track'}
          icon={ListChecks}
          accent="violet"
        />
        <StatCard
          label="Completion"
          value={analytics && analytics.totalTasks ? `${completedPct}%` : '—'}
          sub={analytics && analytics.totalTasks ? `${analytics.completedTasks}/${analytics.totalTasks} done` : 'No data'}
          icon={TrendingUp}
          accent="teal"
        />
      </div>

      {/* ============================================================
          SECOND ROW — Schedule + Quick Actions
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <SectionCard
            accent="teal"
            title="Today's Schedule"
            description={`${todayMeetings.length} meeting${todayMeetings.length === 1 ? '' : 's'}`}
            action={
              <button onClick={() => setView('meetings')} className="press-tactile text-[11px] text-primary hover:underline flex items-center gap-0.5">
                All <ArrowRight className="h-3 w-3" />
              </button>
            }
          >
            <div className="space-y-0">
              {todayMeetings.length > 0 ? todayMeetings.slice(0, 4).map((m) => {
                const typeColors: Record<string, string> = { STANDUP: 'bg-emerald-400', REVIEW: 'bg-sky-400', TRAINING: 'bg-rose-400', MEETING: 'bg-primary', INTERVIEW: 'bg-violet-400', OTHER: 'bg-amber-400' }
                return (
                  <div key={m.id} onClick={() => setView('meetings')} className="press-tactile flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0 group cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors">
                    <div className="text-[12px] font-semibold text-muted-foreground w-12 shrink-0 pt-0.5 tabular-nums">{fmtTime(m.startTime)}</div>
                    <div className={`w-0.5 self-stretch rounded-full ${typeColors[m.type] || 'bg-zinc-300'} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium group-hover:text-primary transition-colors truncate">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.description || m.location}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                  </div>
                )
              }) : (
                <EmptyState
                  icon={Calendar}
                  title="No meetings scheduled today"
                  description="Enjoy the focus time — your calendar is clear."
                  accent="teal"
                />
              )}
            </div>
          </SectionCard>
        </div>

        {/* Quick Actions */}
        <div>
          <SectionCard accent="warm" title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Attendance', icon: Clock, view: 'attendance' as const, tile: 'icon-tile-emerald' },
                { label: 'Apply Leave', icon: CalendarDays, view: 'leave' as const, tile: 'icon-tile-amber' },
                { label: 'My Tasks', icon: ListChecks, view: 'tasks' as const, tile: 'icon-tile-violet' },
                { label: 'Service Request', icon: Megaphone, view: 'requests' as const, tile: 'icon-tile-rose' },
              ].map((a) => {
                const Icon = a.icon
                return (
                  <button key={a.label} onClick={() => setView(a.view)} className="press-tactile flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-left hover:bg-accent/40 hover:border-border transition-all group">
                    <div className={`h-6 w-6 rounded-md grid place-items-center ${a.tile}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-[12px] font-medium">{a.label}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setView('ai-assistant')} className="press-tactile w-full mt-2 flex items-center gap-2 rounded-lg border border-dashed border-violet-300/40 bg-violet-500/5 px-3 py-2 text-left hover:bg-violet-500/10 transition-colors group">
              <div className="h-6 w-6 rounded-md grid place-items-center icon-tile-ai">
                <Sparkles className="h-3 w-3" />
              </div>
              <span className="text-[12px] font-medium text-violet-600">Ask AI Assistant</span>
            </button>
          </SectionCard>
        </div>
      </div>

      {/* ============================================================
          THIRD ROW — My Tasks + Leave Balance
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My Tasks */}
        <div className="lg:col-span-2">
          <SectionCard
            accent="violet"
            title="My Tasks"
            description={`${pending.length} pending · ${inProgress.length} in progress · ${overdue.length} overdue`}
            action={
              <button onClick={() => setView('tasks')} className="press-tactile text-[11px] text-primary hover:underline flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            }
          >
            {pending.length > 0 ? (
              <div className="space-y-1">
                {pending.slice(0, 4).map((t) => {
                  const d = t.deadline ? daysUntil(t.deadline) : null
                  return (
                    <div key={t.id} onClick={() => setView('tasks')} className="press-tactile flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-accent/40 cursor-pointer transition-colors group">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.status === 'IN_PROGRESS' ? 'bg-sky-500' : 'bg-zinc-300'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{t.project?.name || 'No project'}</p>
                      </div>
                      {d !== null && d < 0 && <Pill tone="rose">Overdue</Pill>}
                      {d !== null && d >= 0 && d <= 3 && <Pill tone="amber">{d === 0 ? 'Today' : `${d}d left`}</Pill>}
                      {d !== null && d > 3 && <span className="text-[10px] text-muted-foreground tabular-nums">{d}d</span>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up"
                description="No pending tasks — enjoy the breather."
                accent="emerald"
              />
            )}
          </SectionCard>
        </div>

        {/* Leave Balance */}
        <div>
          <SectionCard accent="violet" title="Leave Balance">
            <div className="space-y-3">
              {balance && [
                { label: 'Casual', value: balance.casualLeave, total: 12, tone: 'primary' as const },
                { label: 'Sick', value: balance.sickLeave, total: 12, tone: 'warm' as const },
                { label: 'Earned', value: balance.earnedLeave, total: 15, tone: 'success' as const },
              ].map((l) => (
                <div key={l.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium">{l.label}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{l.value}/{l.total}</span>
                  </div>
                  <ProgressBar value={l.value} max={l.total} tone={l.tone} showLabel />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ============================================================
          FOURTH ROW — Goals + Holidays + Announcements
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Goals */}
        <div>
          <SectionCard
            accent="success"
            title="Goals"
            action={<button onClick={() => setView('goals')} className="press-tactile text-[11px] text-primary hover:underline">All</button>}
          >
            {goals.length > 0 ? goals.slice(0, 3).map((g) => (
              <div key={g.id} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-medium truncate">{g.title}</span>
                  <span className={`text-[10px] font-semibold tabular-nums ${g.progress >= 100 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{g.progress}%</span>
                </div>
                <ProgressBar value={g.progress} tone={g.progress >= 100 ? 'success' : 'primary'} />
              </div>
            )) : (
              <EmptyState
                icon={TrendingUp}
                title="No active goals"
                description="Set your next milestone to track progress."
                accent="emerald"
              />
            )}
          </SectionCard>
        </div>

        {/* Holidays */}
        <div>
          <SectionCard
            accent="teal"
            title="Holidays"
            action={<button onClick={() => setView('calendar')} className="press-tactile text-[11px] text-primary hover:underline">Calendar</button>}
          >
            <div className="space-y-2">
              {upcomingHolidays.slice(0, 3).map((h) => (
                <div key={h.id} className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center justify-center h-9 w-9 rounded-md icon-tile-teal shrink-0">
                    <span className="text-[8px] font-medium uppercase tracking-wide">{fmtDate(h.date, 'MMM')}</span>
                    <span className="text-[13px] font-bold leading-none tabular-nums">{fmtDate(h.date, 'd')}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate">{h.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(h.date, 'EEE')} · {h.type}</p>
                  </div>
                </div>
              ))}
              {upcomingHolidays.length === 0 && (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming holidays"
                  description="Check back closer to festival season."
                  accent="teal"
                />
              )}
            </div>
          </SectionCard>
        </div>

        {/* Announcements */}
        <div>
          <SectionCard
            accent="warm"
            title="Announcements"
            action={<button onClick={() => setView('announcements')} className="press-tactile text-[11px] text-primary hover:underline">All</button>}
          >
            <div className="space-y-2">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} onClick={() => setView('announcements')} className="press-tactile cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent/40 transition-colors">
                  <p className="text-[12px] font-medium leading-snug truncate">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.authorName} · {fmtRelative(a.publishedAt)}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <EmptyState
                  icon={Megaphone}
                  title="No announcements"
                  description="New company updates will appear here."
                  accent="amber"
                />
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Activity Feed — full width */}
      <ActivityFeed />
    </div>
  )
}

// Inline Activity Feed (simplified, wrapped in SectionCard)
function ActivityFeed() {
  const { currentEmployee } = useApp()
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => {
    if (!currentEmployee) return
    const isManager = ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)
    const url = isManager ? `/api/activity?scope=org&managerId=${currentEmployee.id}&limit=8` : `/api/activity?limit=8`
    authedFetch(url).then(r => r.ok ? r.json() : []).then(a => setActivities(Array.isArray(a) ? a : [])).catch(() => {})
  }, [currentEmployee])

  if (activities.length === 0) return null

  return (
    <SectionCard accent="teal" title="Recent Activity">
      <div className="space-y-0">
        {activities.slice(0, 6).map((a) => (
          <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
            <span className="h-1 w-1 rounded-full bg-primary/40 mt-2 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-snug">
                <span className="font-medium">{a.actorName}</span>{' '}
                <span className="text-muted-foreground">{a.action}</span>
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{a.title}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">{fmtRelative(a.timestamp)}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
