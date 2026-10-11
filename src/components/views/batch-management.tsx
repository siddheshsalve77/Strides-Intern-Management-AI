'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, RowSkeleton, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtDate } from '@/lib/format'
import { Layers, Plus, Users, Clock, AlertTriangle, Loader2, CheckCircle2, CalendarDays, UserCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { InternBatchT, EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

export function BatchManagementView() {
  const { currentEmployee } = useApp()
  const [batches, setBatches] = useState<(InternBatchT & { internCount: number; avgProgress: number; pendingReviews: number; manager?: { id: string; name: string } | null })[]>([])
  const [interns, setInterns] = useState<EmployeeT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [program, setProgram] = useState('Software Engineering Internship')
  const [department, setDepartment] = useState('Engineering')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [capacity, setCapacity] = useState(10)
  const [managerId, setManagerId] = useState('')

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    const [b, emps] = await Promise.all([
      authedFetch('/api/batches').then((r) => r.json()),
      authedFetch('/api/employees?role=MANAGER').then((r) => r.json()).catch(() => []),
    ])
    setBatches(b); setInterns(emps); setLoading(false)
  }
  useEffect(() => { load() }, [currentEmployee])

  async function create() {
    if (!name || !startDate || !endDate) { toast.error('Fill all fields'); return }
    setSubmitting(true)
    try {
      await authedFetch('/api/batches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, program, department, startDate, endDate, capacity, managerId }),
      })
      toast.success('Batch created'); setOpen(false); setName(''); setStartDate(''); setEndDate(''); load()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  const totalInterns = batches.reduce((s, b) => s + b.internCount, 0)
  const totalPending = batches.reduce((s, b) => s + b.pendingReviews, 0)
  const avgProgress = batches.length ? Math.round(batches.reduce((s, b) => s + b.avgProgress, 0) / batches.length) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Management"
        description="Manage intern batches and onboarding programs"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Batch</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Intern Batch</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label className="text-[12px]">Batch Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Autumn 2026" /></div>
                <div className="space-y-1.5"><Label className="text-[12px]">Program</Label><Input value={program} onChange={(e) => setProgram(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-[12px]">Department</Label>
                    <Select value={department} onValueChange={setDepartment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {['Engineering', 'Product', 'Data', 'QA'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-[12px]">Capacity</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 10)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-[12px]">Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-[12px]">End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-[12px]">Manager</Label>
                  <Select value={managerId} onValueChange={setManagerId}><SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger><SelectContent>
                    {interns.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.designation}</SelectItem>)}
                  </SelectContent></Select>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Batch'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Total Batches', value: batches.length, sub: 'programs running', tone: 'info' },
              { label: 'Total Interns', value: totalInterns, sub: 'across batches', tone: 'info' },
              { label: 'Pending Reviews', value: totalPending, sub: 'awaiting feedback', tone: totalPending > 0 ? 'warning' : 'default' },
              { label: 'Avg Progress', value: `${avgProgress}%`, sub: 'completion rate', tone: 'success' },
            ]}
          />
        )}
      </div>

      {loading ? (
        <Card className="p-3"><RowSkeleton count={3} /></Card>
      ) : batches.length === 0 ? (
        <Card><EmptyState icon={Layers} title="No batches" description="Create your first intern batch to get started." /></Card>
      ) : (
        <div className="space-y-3">
          <SectionLabel>Active batches</SectionLabel>
          {batches.map((b, i) => {
            const slotsLeft = b.capacity - b.internCount
            const statusTone =
              b.status === 'ACTIVE' ? 'success' :
              b.status === 'COMPLETED' ? 'info' :
              b.status === 'PLANNED' ? 'neutral' : 'warning'
            return (
              <Card key={b.id} className="p-4 hover:shadow-card transition-all duration-200 animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`status-dot status-dot-${statusTone}`} />
                      <p className="text-[13px] font-semibold truncate">{b.name}</p>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">{b.status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{b.program} · {b.department}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[20px] font-bold tabular-nums leading-none">{b.internCount}<span className="text-[11px] text-muted-foreground font-normal">/{b.capacity}</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">interns</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Avg Progress</span>
                    <span className="font-semibold tabular-nums">{b.avgProgress}%</span>
                  </div>
                  <Progress value={b.avgProgress} className="h-1.5" />
                </div>

                {/* Footer facts */}
                <div className="flex items-center gap-4 pt-3 border-t text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span className="tabular-nums">{b.pendingReviews}</span> reviews
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    <span className="tabular-nums">{slotsLeft}</span> slots
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    <span><span className="tabular-nums">{fmtDate(b.startDate, 'd MMM')}</span> → <span className="tabular-nums">{fmtDate(b.endDate, 'd MMM')}</span></span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 ml-auto">
                    <UserCircle2 className="h-3 w-3" />
                    {b.manager ? b.manager.name : 'Unassigned'}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* At-risk detection */}
      {batches.length > 0 && (
        <Card className="p-4 animate-rise">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-[13px] font-semibold">At-Risk Detection</p>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Interns with overdue tasks, low attendance, or multiple change requests are flagged here.</p>
          <div className="space-y-1.5">
            {batches.map((b) => b.internCount > 0 && b.pendingReviews > 0 && (
              <div key={b.id} className="compact-row border border-amber-500/20 bg-amber-500/5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 grid place-items-center shrink-0"><AlertTriangle className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium">{b.name}</p>
                  <p className="text-[11px] text-muted-foreground">{b.pendingReviews} pending review{b.pendingReviews > 1 ? 's' : ''} need attention</p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-600 h-5 px-1.5">Action needed</Badge>
              </div>
            ))}
            {batches.every((b) => b.pendingReviews === 0) && (
              <div className="flex items-center gap-2 py-3 px-3 text-[12px] text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                No at-risk interns detected. All clear!
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
