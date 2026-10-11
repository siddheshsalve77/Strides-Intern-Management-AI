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
import { PageHeader, MetricStrip, EmptyState, RowSkeleton, StatusDot, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtRelative, priorityColor } from '@/lib/format'
import { cn } from '@/lib/utils'
import { LifeBuoy, Plus, Clock, CheckCircle2, Loader2, AlertCircle, Wrench, Monitor, Mail, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { HRRequestT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const categoryIcons: Record<string, any> = { HR: LifeBuoy, IT: Monitor, ADMIN: Wrench, FINANCE: Mail, FACILITIES: Wrench, ACCESS: AlertCircle, DOCUMENT: LifeBuoy, OTHER: AlertCircle }

const statusFlow = ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CREATED: 'neutral',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'success',
}

export function RequestsView() {
  const { currentEmployee } = useApp()
  const [reqs, setReqs] = useState<HRRequestT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [category, setCategory] = useState('IT')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [filter, setFilter] = useState('ALL')

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    const scope = ['HR', 'ADMIN'].includes(currentEmployee.role) ? 'all' : ''
    const url = scope ? `/api/requests?scope=all` : `/api/requests?employeeId=${currentEmployee.id}`
    try {
      const r = await authedFetch(url).then((r) => r.json())
      setReqs(Array.isArray(r) ? r : [])
    } catch {
      setReqs([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function create() {
    if (!currentEmployee || !subject) { toast.error('Subject required'); return }
    setSubmitting(true)
    try {
      await authedFetch('/api/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, category, subject, description, priority }),
      })
      toast.success('Request submitted'); setOpen(false); setSubject(''); setDescription(''); load()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  async function advance(id: string, status: string) {
    await authedFetch(`/api/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, assignedTo: 'Support Team' }) })
    toast.success('Request updated'); load()
  }

  const isStaff = currentEmployee && ['HR', 'ADMIN'].includes(currentEmployee.role)
  const filtered = filter === 'ALL' ? reqs : reqs.filter((r) => r.status === filter)
  const open_ = reqs.filter((r) => !['RESOLVED', 'CLOSED'].includes(r.status)).length
  const resolvedCount = reqs.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length
  const criticalCount = reqs.filter((r) => r.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(r.status)).length

  const chips = ['ALL', ...statusFlow]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Requests"
        description="Raise and track HR, IT, Admin & Finance requests"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Raise Request</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Raise a Service Request</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['HR', 'IT', 'ADMIN', 'FINANCE', 'FACILITIES', 'ACCESS', 'DOCUMENT', 'OTHER'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief subject" /></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe your issue…" /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <MetricStrip
        metrics={[
          { label: 'Total', value: reqs.length, sub: 'all tickets' },
          { label: 'Open', value: open_, sub: 'in flight', tone: 'warning' },
          { label: 'Resolved', value: resolvedCount, sub: 'closed', tone: 'success' },
          { label: 'Critical', value: criticalCount, sub: 'high priority', tone: 'danger' },
        ]}
      />

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <SectionLabel className="mr-1">Filter</SectionLabel>
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200',
              filter === c
                ? 'bg-primary text-primary-foreground border-primary shadow-card'
                : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {c === 'ALL' ? 'All' : c.replace('_', ' ').toLowerCase()}
          </button>
        ))}
      </div>

      {/* Request list */}
      {loading ? (
        <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={5} /></div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={LifeBuoy} title="No requests" description="Raise a request to get started." /></Card>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((r, i) => {
              const Icon = categoryIcons[r.category] || LifeBuoy
              const step = statusFlow.indexOf(r.status)
              const tone = statusTone[r.status] || 'neutral'
              return (
                <div key={r.id} className="p-3.5 animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="flex items-center gap-3">
                    <StatusDot tone={tone} />
                    <div className="h-8 w-8 rounded-lg bg-primary/8 text-primary grid place-items-center shrink-0"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{r.ticketId}</span>
                        <p className="font-medium text-[13px] leading-tight truncate">{r.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {r.employee && <span className="text-[10px] text-muted-foreground">by {r.employee.name}</span>}
                        {r.assignedTo && <span className="text-[10px] text-muted-foreground">· → {r.assignedTo}</span>}
                        <span className="text-[10px] text-muted-foreground tabular-nums">{fmtRelative(r.createdAt)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] border-0', priorityColor(r.priority))}>{r.priority}</Badge>
                    <Badge variant="outline" className="text-[10px] shrink-0">{r.category}</Badge>
                    {isStaff && !['RESOLVED', 'CLOSED'].includes(r.status) && (
                      <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1 shrink-0" onClick={() => advance(r.id, statusFlow[Math.min(step + 1, statusFlow.length - 1)])}>
                        Advance <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {/* mini approval timeline */}
                  <div className="mt-2.5 ml-[51px] flex items-center gap-1">
                    {statusFlow.map((s, i) => (
                      <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors duration-200', i <= step ? (s === 'RESOLVED' || s === 'CLOSED' ? 'bg-emerald-500' : 'bg-primary') : 'bg-muted')} />
                    ))}
                  </div>
                  {r.resolution && <p className="text-[11px] text-emerald-600 mt-2 ml-[51px]">✓ {r.resolution}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
