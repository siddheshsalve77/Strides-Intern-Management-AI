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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader, MetricStrip, EmptyState, SectionCard, SectionLabel } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { fmtDate, fmtRelative, initials } from '@/lib/format'
import { UserMinus, UserCheck, FileSignature, ShieldOff, Package, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { OffboardingT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const STAGES = [
  { id: 'INITIATED', label: 'Initiated', icon: UserMinus, color: 'bg-amber-500' },
  { id: 'MANAGER_APPROVED', label: 'Manager Approved', icon: UserCheck, color: 'bg-sky-500' },
  { id: 'HR_PROCESSING', label: 'HR Processing', icon: FileSignature, color: 'bg-violet-500' },
  { id: 'ASSET_RETURN', label: 'Asset Return', icon: Package, color: 'bg-teal-500' },
  { id: 'ACCESS_REVOKED', label: 'Access Revoked', icon: ShieldOff, color: 'bg-rose-500' },
  { id: 'EXIT_DOCUMENTATION', label: 'Exit Docs', icon: FileSignature, color: 'bg-indigo-500' },
  { id: 'COMPLETED', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-500' },
]

export function OffboardingView() {
  const { currentEmployee } = useApp()
  const [records, setRecords] = useState<OffboardingT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [empId, setEmpId] = useState('')
  const [type, setType] = useState('RESIGNATION')
  const [reason, setReason] = useState('')
  const [lastWorkingDay, setLastWorkingDay] = useState('')
  const [employees, setEmployees] = useState<any[]>([])

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    const scope = ['HR', 'ADMIN', 'MANAGER'].includes(currentEmployee.role) ? 'all' : ''
    const url = scope ? `/api/offboarding?scope=all` : `/api/offboarding?employeeId=${currentEmployee.id}`
    try {
      const r = await authedFetch(url).then((r) => r.json())
      setRecords(Array.isArray(r) ? r : [])
      if (['HR', 'ADMIN'].includes(currentEmployee.role)) {
        const emps = await authedFetch('/api/employees').then((r) => r.json())
        setEmployees(Array.isArray(emps) ? emps : [])
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function create() {
    if (!empId || !reason) { toast.error('Select employee and reason'); return }
    setSubmitting(true)
    try {
      const res = await authedFetch('/api/offboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId, type, reason, lastWorkingDay }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('Offboarding initiated'); setOpen(false); setReason(''); setLastWorkingDay(''); load()
    } catch (e: any) { toast.error(e.message || 'Failed') } finally { setSubmitting(false) }
  }

  async function advance(id: string, currentStatus: string) {
    const idx = STAGES.findIndex((s) => s.id === currentStatus)
    if (idx < 0 || idx >= STAGES.length - 1) return
    const next = STAGES[idx + 1].id
    await authedFetch('/api/offboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: next }) })
    toast.success(`Advanced to ${next.replace(/_/g, ' ').toLowerCase()}`); load()
  }

  async function cancel(id: string) {
    await authedFetch('/api/offboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'CANCELLED' }) })
    toast.success('Offboarding cancelled'); load()
  }

  const isHRorAdmin = currentEmployee && ['HR', 'ADMIN', 'MANAGER'].includes(currentEmployee.role)
  const active = records.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length
  const completed = records.filter((r) => r.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offboarding"
        description="Manage employee exit workflows"
        actions={isHRorAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><UserMinus className="h-4 w-4" /> Initiate Offboarding</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Initiate Offboarding</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Employee</Label>
                  <Select value={empId} onValueChange={setEmpId}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.designation}</SelectItem>)}
                  </SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    {['RESIGNATION', 'CONTRACT_END', 'TERMINATION'].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div>
                <div className="space-y-1.5"><Label>Last Working Day</Label><Input type="date" value={lastWorkingDay} onChange={(e) => setLastWorkingDay(e.target.value)} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Initiate'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <MetricStrip
        metrics={[
          { label: 'Total', value: records.length, sub: 'records' },
          { label: 'Active', value: active, sub: 'in progress', tone: 'warning' },
          { label: 'Completed', value: completed, sub: 'fully exited', tone: 'success' },
          { label: 'Stages', value: STAGES.length - 1, sub: 'per workflow' },
        ]}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : records.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={UserMinus} title="No offboarding records" description="Offboarding workflows will appear here." /></Card>
      ) : (
        <div className="space-y-4">
          {records.map((r) => {
            const stageIdx = STAGES.findIndex((s) => s.id === r.status)
            const pct = stageIdx >= 0 ? Math.round((stageIdx / (STAGES.length - 1)) * 100) : 0
            const isDone = r.status === 'COMPLETED'
            const isCancelled = r.status === 'CANCELLED'
            return (
              <SectionCard key={r.id} className={cn('shadow-card animate-rise', isCancelled && 'opacity-60')} >
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-11 w-11 shrink-0"><AvatarImage src={r.employee?.photoUrl} /><AvatarFallback className="bg-primary/15 text-primary text-[11px]">{r.employee ? initials(r.employee.name) : '?'}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[13px] leading-tight">{r.employee?.name}</p>
                      <Badge variant="outline" className="text-[10px] border-0">{r.type.replace(/_/g, ' ').toLowerCase()}</Badge>
                      <Badge variant="outline" className={cn('text-[10px] border-0', isDone ? 'bg-emerald-500/15 text-emerald-600' : isCancelled ? 'bg-zinc-400/15 text-zinc-500' : 'bg-amber-500/15 text-amber-600')}>{r.status.replace(/_/g, ' ').toLowerCase()}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.employee?.designation} · {r.employee?.department}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1">Reason: {r.reason}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground tabular-nums">
                      <span>Requested {fmtDate(r.requestedDate, 'd MMM yyyy')}</span>
                      {r.lastWorkingDay && <span>· Last day: {fmtDate(r.lastWorkingDay, 'd MMM yyyy')}</span>}
                      <span>· {fmtRelative(r.requestedDate)}</span>
                    </div>
                  </div>
                  {isHRorAdmin && !isDone && !isCancelled && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1" onClick={() => advance(r.id, r.status)}>Advance <ArrowRight className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-[11px] h-7 text-rose-600" onClick={() => cancel(r.id)}>Cancel</Button>
                    </div>
                  )}
                </div>

                {!isCancelled && (
                  <>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <SectionLabel>Exit Progress</SectionLabel>
                        <span className="font-semibold tabular-nums">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                    <div className="space-y-3 pt-2">
                      {STAGES.map((s, i) => {
                        const Icon = s.icon
                        const reached = i <= stageIdx
                        const isCurrent = i === stageIdx
                        return (
                          <div key={s.id} className="timeline-rail" style={{ animationDelay: `${i * 0.02}s` }}>
                            <span className={cn(
                              'timeline-dot',
                              reached && 'timeline-dot-done',
                              isCurrent && !isDone && 'timeline-dot-now'
                            )} />
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className={cn('h-3.5 w-3.5 shrink-0', reached ? 'text-foreground' : 'text-muted-foreground/40')} />
                              <span className={cn('text-[12px] truncate', reached ? 'font-medium' : 'text-muted-foreground')}>{s.label}</span>
                              {isCurrent && !isDone && <Badge variant="outline" className="text-[9px] border-0 bg-amber-500/15 text-amber-600 ml-auto">Now</Badge>}
                              {isDone && reached && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {r.exitNotes && <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">Exit notes: {r.exitNotes}</p>}
                  </>
                )}
              </SectionCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
