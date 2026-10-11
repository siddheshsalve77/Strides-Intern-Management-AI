'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useApp as useAppStore } from '@/lib/store'
import {
  Users, UserCheck, CalendarDays, LifeBuoy, ListChecks, AlertCircle, Building2,
  GraduationCap, FolderKanban, TrendingUp,
} from 'lucide-react'

interface OrgStats {
  scope: string
  totalEmployees?: number
  teamSize?: number
  presentToday: number
  attendancePct: number
  pendingLeaves: number
  openTickets: number
  pendingTasks: number
  overdueTasks: number
  onboardingCount?: number
  activeProjects?: number
}

export function OrgStatsWidget() {
  const { currentEmployee, setView } = useAppStore()
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentEmployee) return
    const isHRorAdmin = ['HR', 'ADMIN'].includes(currentEmployee.role)
    const url = isHRorAdmin
      ? '/api/org-stats?scope=org'
      : `/api/org-stats?managerId=${currentEmployee.id}`
    fetch(url).then((r) => r.json()).then((s) => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
  }, [currentEmployee])

  if (loading || !stats) return null

  const isOrg = stats.scope === 'org'
  const heading = isOrg ? 'Organization Overview' : 'Team Overview'
  const peopleLabel = isOrg ? 'Total Employees' : 'Team Size'
  const peopleValue = isOrg ? stats.totalEmployees! : stats.teamSize!

  const stats_ = [
    { label: peopleLabel, value: peopleValue, icon: Users, color: 'text-primary', bg: 'bg-primary/10', view: 'employees' as const },
    { label: 'Present Today', value: stats.presentToday, sub: `${stats.attendancePct}%`, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10', view: 'attendance' as const },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: CalendarDays, color: 'text-amber-600', bg: 'bg-amber-500/10', view: 'leave' as const },
    { label: 'Open Tickets', value: stats.openTickets, icon: LifeBuoy, color: 'text-violet-600', bg: 'bg-violet-500/10', view: 'requests' as const },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: ListChecks, color: 'text-sky-600', bg: 'bg-sky-500/10', view: 'tasks' as const },
    { label: 'Overdue', value: stats.overdueTasks, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-500/10', view: 'tasks' as const },
  ]
  if (isOrg) {
    stats_.push({ label: 'Onboarding', value: stats.onboardingCount!, icon: GraduationCap, color: 'text-teal-600', bg: 'bg-teal-500/10', view: 'onboarding' as const })
    stats_.push({ label: 'Active Projects', value: stats.activeProjects!, icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-500/10', view: 'projects' as const })
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sidebar to-sidebar/90 text-sidebar-foreground p-5">
      <div className="absolute inset-0 bg-grid opacity-10" />
      <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">{heading}</p>
            <p className="text-lg font-bold mt-0.5">{isOrg ? 'Strides Software' : 'Your Team'}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/20 grid place-items-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {stats_.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.label}
                onClick={() => setView(s.view)}
                className="flex items-center gap-2.5 rounded-lg bg-white/5 border border-white/10 p-2.5 text-left hover:bg-white/10 transition-colors"
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${s.bg} ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1">
                    <p className="text-lg font-bold leading-none">{s.value}</p>
                    {s.sub && <span className="text-[10px] text-sidebar-foreground/60 font-medium">{s.sub}</span>}
                  </div>
                  <p className="text-[10px] text-sidebar-foreground/60 mt-0.5 truncate">{s.label}</p>
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-sidebar-foreground/70 flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Attendance Rate</span>
            <span className="font-bold">{stats.attendancePct}%</span>
          </div>
          <Progress value={stats.attendancePct} className="h-1.5 bg-white/10 [&>div]:bg-primary" />
        </div>
      </div>
    </Card>
  )
}
