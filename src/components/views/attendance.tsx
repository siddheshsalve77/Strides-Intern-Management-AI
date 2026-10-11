'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, MetricStrip, Timeline, CompactRow, StatusDot, SectionLabel, RowSkeleton } from '@/components/portal/ui-helpers'
import { AttendanceHeatmap } from '@/components/portal/attendance-heatmap'
import { fmtDate, fmtTime, attendanceColor } from '@/lib/format'
import { Play, Square, Clock, CheckCircle2, Users, Coffee } from 'lucide-react'
import type { AttendanceT } from '@/lib/types'
import { toast } from 'sonner'
import { authedFetch } from '@/lib/firebase-auth'

export function AttendanceView() {
  const { currentEmployee } = useApp()
  const [records, setRecords] = useState<AttendanceT[]>([])
  const [team, setTeam] = useState<{ employee: any; attendance: AttendanceT | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    try {
      const [recs] = await Promise.all([
        authedFetch(`/api/attendance?employeeId=${currentEmployee.id}&limit=90`).then((r) => r.json()).catch(() => []),
      ])
      setRecords(Array.isArray(recs) ? recs : [])
      if (currentEmployee.role === 'MANAGER' || currentEmployee.role === 'HR' || currentEmployee.role === 'ADMIN') {
        // team attendance
        authedFetch(`/api/attendance/team?managerId=${currentEmployee.id}`).then((r) => r.json()).then((t) => setTeam(Array.isArray(t) ? t : [])).catch(() => {})
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [currentEmployee])

  const today = records[0]
  const isCheckedIn = today?.checkIn && !today?.checkOut
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6

  async function clock(action: 'CHECK_IN' | 'CHECK_OUT') {
    if (!currentEmployee) return
    setClocking(true)
    try {
      const res = await authedFetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, action }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success(action === 'CHECK_IN' ? 'Checked in successfully' : 'Checked out successfully')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setClocking(false) }
  }

  // Stats
  const presentDays = records.filter((r) => ['PRESENT', 'LATE'].includes(r.status)).length
  const lateDays = records.filter((r) => r.status === 'LATE').length
  const totalHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0)
  const avgHours = presentDays > 0 ? totalHours / presentDays : 0
  const attPct = records.length > 0 ? Math.round((presentDays / records.filter((r) => r.status !== 'WEEKEND').length) * 100) : 0

  const isManager = currentEmployee && ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)

  // Timeline items for today's flow: clock-in → work → clock-out
  const todaysTimeline = isWeekend
    ? [{ dot: 'now' as const, title: 'Weekend — no attendance required', meta: fmtDate(new Date(), 'EEEE') }]
    : [
        {
          dot: (today?.checkIn ? 'done' : 'now') as 'done' | 'now',
          title: today?.checkIn ? `Checked in · ${fmtTime(today.checkIn)}` : 'Not yet checked in',
          meta: 'Check In',
        },
        ...(isCheckedIn && today?.checkIn
          ? [{ dot: 'now' as const, title: `Working now · ${((Date.now() - new Date(today.checkIn).getTime()) / 3600000).toFixed(1)}h so far`, meta: 'In progress' }]
          : today?.checkOut && today?.workHours
            ? [{ dot: 'done' as const, title: `Worked · ${today.workHours.toFixed(1)}h`, meta: 'Session' }]
            : []),
        ...(today?.checkOut
          ? [{ dot: 'done' as const, title: `Checked out · ${fmtTime(today.checkOut)}`, meta: 'Check Out' }]
          : !today?.checkIn
            ? []
            : [{ dot: 'default' as const, title: 'Pending check-out', meta: 'Check Out' }]),
      ]

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance & Time" description="Track your check-ins, working hours and attendance history" />

      {/* Clock-in hero with timeline */}
      <Card className="relative overflow-hidden p-0 shadow-card animate-rise">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-0">
          {/* Left: state + action */}
          <div className="lg:col-span-2 p-6 border-b lg:border-b-0 lg:border-r border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="section-label">Today</p>
                <p className="text-[13px] font-medium leading-tight mt-0.5">{fmtDate(new Date(), 'EEEE, d MMMM yyyy')}</p>
              </div>
            </div>
            <p className="text-[22px] font-bold tracking-tight mt-4 tabular-nums">
              {isWeekend ? 'Weekend' : today?.checkIn ? `In since ${fmtTime(today.checkIn)}` : 'Not checked in'}
            </p>
            {today?.checkOut && (
              <p className="text-[12px] text-muted-foreground mt-1 tabular-nums">
                Checked out at {fmtTime(today.checkOut)} · {today.workHours?.toFixed(1)}h
              </p>
            )}
            <div className="flex items-center gap-2 mt-4">
              {isWeekend ? (
                <Badge variant="secondary" className="gap-1.5"><Coffee className="h-3 w-3" /> Weekend</Badge>
              ) : !today?.checkIn ? (
                <Button size="sm" className="gap-2 shadow-sm" onClick={() => clock('CHECK_IN')} disabled={clocking}>
                  <Play className="h-3.5 w-3.5" /> Check In
                </Button>
              ) : !today?.checkOut ? (
                <Button size="sm" variant="destructive" className="gap-2 shadow-sm" onClick={() => clock('CHECK_OUT')} disabled={clocking}>
                  <Square className="h-3.5 w-3.5" /> Check Out
                </Button>
              ) : (
                <Badge variant="secondary" className="gap-1.5 bg-emerald-500/15 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Day complete</Badge>
              )}
            </div>
          </div>

          {/* Right: timeline of today's flow */}
          <div className="lg:col-span-3 p-6 surface-tinted">
            <SectionLabel className="mb-3">Today's Flow</SectionLabel>
            {todaysTimeline.length > 0 ? (
              <Timeline items={todaysTimeline} />
            ) : (
              <p className="text-[12px] text-muted-foreground py-2">No activity yet today.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Stats — MetricStrip */}
      <div className="animate-rise animate-rise-delay-1">
        <MetricStrip
          metrics={[
            { label: 'Attendance Rate', value: `${attPct}%`, sub: 'This month', tone: 'success' },
            { label: 'Present Days', value: presentDays, sub: `Out of ${records.filter(r => r.status !== 'WEEKEND').length} working`, tone: 'info' },
            { label: 'Avg Hours', value: `${avgHours.toFixed(1)}h`, sub: 'Per working day', tone: 'default' },
            { label: 'Late Arrivals', value: lateDays, sub: 'This month', tone: lateDays > 0 ? 'warning' : 'default' },
          ]}
        />
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">My Attendance</TabsTrigger>
          {isManager && <TabsTrigger value="team">Team Attendance</TabsTrigger>}
        </TabsList>

        <TabsContent value="history">
          {!loading && records.length > 0 && (
            <div className="mb-4 animate-rise">
              <AttendanceHeatmap data={records.map((r) => ({ date: r.date.split('T')[0], hours: r.workHours, status: r.status }))} />
            </div>
          )}
          <Card className="shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold">Attendance History</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Daily check-in records</p>
              </div>
              <Badge variant="outline" className="text-[10px] tabular-nums">Last {records.length || 30} days</Badge>
            </div>
            {loading ? (
              <div className="p-3"><RowSkeleton count={8} /></div>
            ) : (
              <div className="p-2 max-h-[28rem] overflow-y-auto scrollbar-thin">
                {records.map((r) => {
                  const tone =
                    r.status === 'PRESENT' ? 'success' :
                    r.status === 'LATE' ? 'warning' :
                    r.status === 'ABSENT' ? 'danger' :
                    r.status === 'WEEKEND' || r.status === 'HOLIDAY' ? 'neutral' :
                    'info'
                  return (
                    <CompactRow
                      key={r.id}
                      leading={
                        <div className="flex flex-col items-center justify-center h-9 w-9 rounded-md bg-muted/60 shrink-0">
                          <span className="text-[8px] font-semibold uppercase text-muted-foreground">{fmtDate(r.date, 'MMM')}</span>
                          <span className="text-[14px] font-bold leading-none tabular-nums">{fmtDate(r.date, 'd')}</span>
                        </div>
                      }
                      title={
                        <div className="flex items-center gap-2">
                          <StatusDot tone={tone as any} />
                          <span className="text-[12px] font-medium">{fmtDate(r.date, 'EEEE, d MMM')}</span>
                        </div>
                      }
                      subtitle={
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {r.checkIn ? `In ${fmtTime(r.checkIn)}` : '—'}  ·  {r.checkOut ? `Out ${fmtTime(r.checkOut)}` : '—'}
                        </span>
                      }
                      trailing={
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold tabular-nums">{r.workHours ? `${r.workHours.toFixed(1)}h` : '—'}</span>
                          <Badge variant="outline" className={`text-[9px] ${attendanceColor(r.status)}`}>{r.status.replace('_', ' ')}</Badge>
                        </div>
                      }
                    />
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="team">
            <Card className="shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold">Team Attendance Today</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Live status of your direct reports</p>
                </div>
                <Badge variant="outline" className="text-[10px] gap-1 tabular-nums"><Users className="h-3 w-3" /> {team.length} members</Badge>
              </div>
              {loading ? (
                <div className="p-3"><RowSkeleton count={6} /></div>
              ) : (
                <div className="p-2 max-h-[28rem] overflow-y-auto scrollbar-thin">
                  {team.map(({ employee, attendance }) => {
                    const status = attendance?.status
                    const tone =
                      status === 'PRESENT' ? 'success' :
                      status === 'LATE' ? 'warning' :
                      status === 'ABSENT' ? 'danger' :
                      'neutral'
                    return (
                      <CompactRow
                        key={employee.id}
                        leading={
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0 text-[11px] font-semibold">
                            {employee.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'}
                          </div>
                        }
                        title={<span className="text-[12px] font-medium">{employee.name}</span>}
                        subtitle={<span className="text-[11px] text-muted-foreground truncate">{employee.designation}</span>}
                        trailing={
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {attendance?.checkIn ? fmtTime(attendance.checkIn) : '—'} {attendance?.workHours ? `· ${attendance.workHours.toFixed(1)}h` : ''}
                            </span>
                            {attendance ? (
                              <span className="inline-flex items-center gap-1.5">
                                <StatusDot tone={tone as any} />
                                <span className="text-[10px] text-muted-foreground">{attendance.status.replace('_', ' ')}</span>
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-[9px] bg-zinc-400/15 text-zinc-500">Not marked</Badge>
                            )}
                          </div>
                        }
                      />
                    )
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
