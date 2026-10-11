'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { PageHeader, EmptyState, MetricStrip, Timeline, CompactRow, StatusDot, RowSkeleton } from '@/components/portal/ui-helpers'
import { fmtDate } from '@/lib/format'
import { CalendarDays, Check, X, Clock, Plus, Plane, Heart, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import type { LeaveRequestT, LeaveBalanceT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

export function LeaveView() {
  const { currentEmployee } = useApp()
  const [leaves, setLeaves] = useState<LeaveRequestT[]>([])
  const [balance, setBalance] = useState<LeaveBalanceT | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // form
  const [leaveType, setLeaveType] = useState('CASUAL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    // Managers see their team's leave requests; HR/Admin see all; employees see their own
    let params: string
    if (currentEmployee.role === 'MANAGER') {
      params = `managerId=${currentEmployee.id}`
    } else if (currentEmployee.role === 'HR' || currentEmployee.role === 'ADMIN') {
      params = `scope=all`
    } else {
      params = `employeeId=${currentEmployee.id}`
    }
    try {
      const [l, b] = await Promise.all([
        authedFetch(`/api/leave?${params}`).then((r) => r.json()).catch(() => []),
        authedFetch(`/api/leave/balance?employeeId=${currentEmployee.id}`).then((r) => r.json()).catch(() => ({})),
      ])
      setLeaves(Array.isArray(l) ? l : []); setBalance(b && typeof b === 'object' && !Array.isArray(b) ? b : {})
    } catch {
      setLeaves([]); setBalance({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [currentEmployee])

  const days = fromDate && toDate
    ? Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000) + 1)
    : 0

  async function apply() {
    if (!currentEmployee || !fromDate || !toDate || !reason) { toast.error('Fill all fields'); return }
    setSubmitting(true)
    try {
      const res = await authedFetch('/api/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, leaveType, fromDate, toDate, days, reason }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Leave request submitted')
      setOpen(false); setReason(''); setFromDate(''); setToDate('')
      load()
    } catch { toast.error('Failed to submit') }
    finally { setSubmitting(false) }
  }

  async function decide(id: string, action: 'APPROVE' | 'REJECT', note?: string) {
    if (!currentEmployee) return
    try {
      await authedFetch('/api/leave', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, approverId: currentEmployee.id, note }),
      })
      toast.success(action === 'APPROVE' ? 'Leave approved' : 'Leave rejected')
      load()
    } catch { toast.error('Action failed') }
  }

  const pending = leaves.filter((l) => l.status === 'PENDING')
  const approved = leaves.filter((l) => l.status === 'APPROVED')
  const isApprover = currentEmployee && ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)

  // Upcoming approved leaves for Timeline
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingLeaves = approved
    .filter((l) => new Date(l.toDate) >= today)
    .sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime())
    .slice(0, 5)

  const balances = [
    { label: 'Casual Leave', value: balance?.casualLeave ?? 0, total: 12, icon: Plane, color: 'bg-sky-500/10 text-sky-600', bar: 'bg-sky-400' },
    { label: 'Sick Leave', value: balance?.sickLeave ?? 0, total: 12, icon: Heart, color: 'bg-rose-500/10 text-rose-600', bar: 'bg-rose-400' },
    { label: 'Earned Leave', value: balance?.earnedLeave ?? 0, total: 15, icon: Briefcase, color: 'bg-emerald-500/10 text-emerald-600', bar: 'bg-emerald-400' },
  ]
  const totalAvailable = (balance?.casualLeave ?? 0) + (balance?.sickLeave ?? 0) + (balance?.earnedLeave ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description="Apply for leave, track balances and approvals"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Request Leave</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg shadow-pop">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      <SelectItem value="SICK">Sick Leave</SelectItem>
                      <SelectItem value="EARNED">Earned Leave</SelectItem>
                      <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>From Date</Label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>To Date</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                </div>
                {days > 0 && <p className="text-sm text-muted-foreground tabular-nums">Total: <span className="font-semibold text-foreground">{days} day{days > 1 ? 's' : ''}</span></p>}
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for leave…" rows={3} />
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground tabular-nums">
                  Available balance: <span className="font-semibold text-foreground">
                    {leaveType === 'CASUAL' ? balance?.casualLeave : leaveType === 'SICK' ? balance?.sickLeave : balance?.earnedLeave} days
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={apply} disabled={submitting}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary metric strip */}
      <div className="animate-rise">
        <MetricStrip
          metrics={[
            { label: 'Total Available', value: totalAvailable, sub: 'days across all types', tone: 'success' },
            { label: 'Pending', value: pending.length, sub: 'awaiting decision', tone: pending.length > 0 ? 'warning' : 'default' },
            { label: 'Approved (all)', value: approved.length, sub: 'this cycle', tone: 'info' },
            { label: 'Upcoming', value: upcomingLeaves.length, sub: 'next scheduled', tone: 'default' },
          ]}
        />
      </div>

      {/* Balances — progress indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-rise animate-rise-delay-1">
        {balances.map((b) => {
          const Icon = b.icon
          const used = b.total - b.value
          const pct = Math.round((b.value / b.total) * 100)
          return (
            <Card key={b.label} className="p-5 shadow-card hover:shadow-card-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${b.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-[10px] tabular-nums">{used} used</Badge>
              </div>
              <p className="section-label">{b.label}</p>
              <p className="text-[22px] font-bold mt-1 tabular-nums leading-none">
                {b.value} <span className="text-[12px] font-normal text-muted-foreground">/ {b.total} days</span>
              </p>
              <div className="h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                <div className={`h-full ${b.bar} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">{pct}% available</p>
            </Card>
          )
        })}
      </div>

      {/* Upcoming leaves timeline + Pending approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming Timeline */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[14px] font-semibold">Upcoming</p>
              <p className="text-[11px] text-muted-foreground">Approved leaves ahead</p>
            </div>
          </div>
          {upcomingLeaves.length > 0 ? (
            <Timeline
              items={upcomingLeaves.map((l) => {
                const start = new Date(l.fromDate)
                const isNow = start <= new Date() && new Date(l.toDate) >= new Date()
                return {
                  dot: isNow ? 'now' : 'done',
                  title: `${l.employee?.name || 'You'} · ${l.leaveType}`,
                  meta: `${l.days}d`,
                  body: `${fmtDate(l.fromDate, 'd MMM')} → ${fmtDate(l.toDate, 'd MMM')}`,
                }
              })}
            />
          ) : (
            <Card className="p-4"><EmptyState icon={CalendarDays} title="No upcoming leave" description="Approved future leaves appear here." /></Card>
          )}
        </div>

        {/* Pending approvals */}
        {isApprover && pending.length > 0 && (
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <p className="text-[14px] font-semibold">Pending Approvals</p>
                <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-600 tabular-nums">{pending.length}</Badge>
              </div>
            </div>
            <Card className="p-2 shadow-card border-amber-500/30">
              <div className="p-2 max-h-[22rem] overflow-y-auto scrollbar-thin">
                {pending.map((l) => (
                  <div key={l.id} className="compact-row flex-wrap !py-3">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 grid place-items-center shrink-0 text-[11px] font-semibold">
                      {l.employee?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[12px] font-medium">{l.employee?.name}</p>
                        <Badge variant="outline" className="text-[9px]">{l.leaveType}</Badge>
                        <Badge variant="outline" className="text-[9px] tabular-nums">{l.days}d</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{fmtDate(l.fromDate)} → {fmtDate(l.toDate)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 italic truncate">"{l.reason}"</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => decide(l.id, 'APPROVE', 'Approved')}>
                        <Check className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-rose-600 border-rose-500/30 hover:bg-rose-500/10" onClick={() => decide(l.id, 'REJECT', 'Not approved')}>
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* History */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <LeaveTable leaves={leaves} loading={loading} />
        </TabsContent>
        <TabsContent value="pending"><LeaveTable leaves={leaves.filter((l) => l.status === 'PENDING')} loading={loading} /></TabsContent>
        <TabsContent value="approved"><LeaveTable leaves={leaves.filter((l) => l.status === 'APPROVED')} loading={loading} /></TabsContent>
      </Tabs>
    </div>
  )
}

function LeaveTable({ leaves, loading }: { leaves: LeaveRequestT[]; loading: boolean }) {
  if (loading) return <Card className="p-3"><RowSkeleton count={5} /></Card>
  if (leaves.length === 0) return <Card><EmptyState icon={CalendarDays} title="No leave requests" description="Leave requests will appear here." /></Card>
  return (
    <Card className="shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">Leave Requests</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{leaves.length} record{leaves.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="p-2 max-h-[28rem] overflow-y-auto scrollbar-thin">
        {leaves.map((l) => {
          const tone =
            l.status === 'APPROVED' ? 'success' :
            l.status === 'PENDING' ? 'warning' :
            l.status === 'REJECTED' ? 'danger' :
            'neutral'
          return (
            <CompactRow
              key={l.id}
              leading={
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0 text-[11px] font-semibold">
                  {l.employee?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'}
                </div>
              }
              title={
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-medium">{l.employee?.name || '—'}</span>
                  <Badge variant="outline" className="text-[9px]">{l.leaveType}</Badge>
                </div>
              }
              subtitle={
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {fmtDate(l.fromDate, 'd MMM')} → {fmtDate(l.toDate, 'd MMM')} · {l.days}d · {fmtDate(l.appliedAt, 'd MMM')}
                </span>
              }
              trailing={
                <div className="flex items-center gap-2 shrink-0">
                  {l.reason && (
                    <span className="text-[10px] text-muted-foreground italic max-w-[160px] truncate hidden sm:inline" title={l.reason}>"{l.reason}"</span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot tone={tone as any} />
                    <span className="text-[10px] text-muted-foreground">{l.status}</span>
                  </span>
                </div>
              }
            />
          )
        })}
      </div>
    </Card>
  )
}
