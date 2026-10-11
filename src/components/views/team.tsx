'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { PageHeader, EmptyState, MetricStrip, RowSkeleton, MetricStripSkeleton, SectionLabel } from '@/components/portal/ui-helpers'
import { TeamPerformanceChart } from '@/components/portal/charts'
import { fmtTime, initials } from '@/lib/format'
import { Users, TrendingUp } from 'lucide-react'
import type { EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

interface TeamAnalytics {
  teamSize: number
  taskStats: { total: number; completed: number; inProgress: number; pending: number; overdue: number }
  avgPerformance: number
  members: { id: string; name: string; designation: string; photoUrl: string }[]
}

export function TeamView() {
  const { currentEmployee, setView } = useApp()
  const [team, setTeam] = useState<{ employee: EmployeeT; attendance: any }[]>([])
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null)
  const [orgStats, setOrgStats] = useState<any>(null)
  const [teamPerf, setTeamPerf] = useState<{ name: string; overall: number; taskCompletion: number; quality: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentEmployee) return
    Promise.all([
      authedFetch(`/api/attendance/team?managerId=${currentEmployee.id}`).then((r) => r.json()).catch(() => []),
      authedFetch(`/api/org-stats?managerId=${currentEmployee.id}`).then((r) => r.json()).catch(() => null),
    ]).then(([t, os]) => {
      setTeam(Array.isArray(t) ? t : [])
      if (os && typeof os === 'object') setOrgStats(os)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [currentEmployee])

  // Fetch each team member's performance for the chart
  useEffect(() => {
    if (!team.length) return
    Promise.all(
      team.map(({ employee }) =>
        authedFetch(`/api/performance?employeeId=${employee.id}`).then((r) => r.json()).then((p) => ({
          name: employee.name.split(' ')[0],
          overall: p[0]?.overall ?? 0,
          taskCompletion: p[0]?.taskCompletion ?? 0,
          quality: p[0]?.quality ?? 0,
        }))
      )
    ).then(setTeamPerf).catch(() => {})
  }, [team])

  const present = team.filter((t) => t.attendance && ['PRESENT', 'LATE'].includes(t.attendance.status)).length
  const late = team.filter((t) => t.attendance?.status === 'LATE').length
  const absent = team.filter((t) => !t.attendance || t.attendance.status === 'ABSENT').length

  if (!currentEmployee || !['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)) {
    return <Card><EmptyState icon={Users} title="Manager access required" description="This view is for managers and HR." /></Card>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Team" description={`${team.length} team members · command center`} />

      {/* KPIs as MetricStrip — dense, scannable */}
      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Team Size', value: team.length, sub: 'direct reports', tone: 'info' },
              { label: 'Present Today', value: present, sub: `${late} late`, tone: 'success' },
              { label: 'Late / Absent', value: late + absent, sub: 'needs attention', tone: late + absent > 0 ? 'warning' : 'default' },
              { label: 'Attendance', value: orgStats ? `${orgStats.attendancePct ?? 0}%` : '—', sub: 'team rate', tone: 'info' },
            ]}
          />
        )}
      </div>

      {orgStats && (
        <div className="animate-rise animate-rise-delay-1">
          <MetricStrip
            metrics={[
              { label: 'Pending Tasks', value: orgStats.pendingTasks ?? 0, sub: 'in queue', tone: 'info' },
              { label: 'Overdue', value: orgStats.overdueTasks ?? 0, sub: 'past deadline', tone: (orgStats.overdueTasks ?? 0) > 0 ? 'danger' : 'default' },
              { label: 'Pending Leaves', value: orgStats.pendingLeaves ?? 0, sub: 'awaiting approval', tone: (orgStats.pendingLeaves ?? 0) > 0 ? 'warning' : 'default' },
              { label: 'Open Tickets', value: orgStats.openTickets ?? 0, sub: 'service queue', tone: 'info' },
            ]}
          />
        </div>
      )}

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          {loading ? <Card className="p-2"><RowSkeleton count={6} /></Card> :
            team.length === 0 ? <Card><EmptyState icon={Users} title="No team members" /></Card> : (
              <Card className="p-0 overflow-hidden animate-rise">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Member</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Designation</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Today</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Check In</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70 text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map(({ employee: e, attendance: a }) => {
                      const tone =
                        a?.status === 'PRESENT' ? 'success' :
                        a?.status === 'LATE' ? 'warning' :
                        a?.status === 'ABSENT' ? 'danger' :
                        a?.status === 'LEAVE' ? 'info' :
                        'neutral'
                      return (
                        <TableRow key={e.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setView('directory')}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <Avatar className="h-8 w-8"><AvatarImage src={e.photoUrl} /><AvatarFallback className="text-[10px] bg-muted text-foreground">{initials(e.name)}</AvatarFallback></Avatar>
                                <span className={`absolute -bottom-0.5 -right-0.5 status-dot status-dot-${tone}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium leading-tight truncate">{e.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{e.employeeId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[12px] text-muted-foreground">{e.designation}</TableCell>
                          <TableCell>
                            {a ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`status-dot status-dot-${tone}`} />
                                <span className="text-[11px] capitalize">{a.status.replace('_', ' ').toLowerCase()}</span>
                              </span>
                            ) : <span className="text-[11px] text-muted-foreground">Not marked</span>}
                          </TableCell>
                          <TableCell className="text-[12px] tabular-nums text-muted-foreground">{a?.checkIn ? fmtTime(a.checkIn) : '—'}</TableCell>
                          <TableCell className="text-[12px] font-medium tabular-nums text-right">{a?.workHours ? `${a.workHours.toFixed(1)}h` : '—'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            )
          }
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-4">
            {teamPerf.length > 0 ? (
              <>
                <Card className="p-5 animate-rise">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[13px] font-semibold">Team Performance Comparison</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Overall vs Tasks vs Quality</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] gap-1"><TrendingUp className="h-3 w-3" />{teamPerf.length} members</Badge>
                  </div>
                  <TeamPerformanceChart data={teamPerf} />
                </Card>
                <Card className="p-4 animate-rise animate-rise-delay-1">
                  <SectionLabel className="mb-2">Individual Performance</SectionLabel>
                  <div className="space-y-2">
                    {teamPerf.map((p, i) => {
                      const emp = team[i]?.employee
                      const tone =
                        p.overall >= 85 ? 'success' :
                        p.overall >= 70 ? 'info' :
                        p.overall >= 50 ? 'warning' : 'danger'
                      return (
                        <div key={i} className="compact-row">
                          <Avatar className="h-8 w-8 shrink-0"><AvatarImage src={emp?.photoUrl} /><AvatarFallback className="text-[10px] bg-muted">{initials(p.name)}</AvatarFallback></Avatar>
                          <div className="w-28 shrink-0 min-w-0">
                            <p className="text-[12px] font-medium truncate leading-tight">{emp?.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp?.designation}</p>
                          </div>
                          <div className="flex-1 min-w-0"><Progress value={p.overall} className="h-1.5" /></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`status-dot status-dot-${tone}`} />
                            <span className="text-[13px] font-bold tabular-nums w-10 text-right">{p.overall}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </>
            ) : (
              <Card><EmptyState icon={TrendingUp} title="No performance data" description="Performance reviews will appear here once available." /></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
