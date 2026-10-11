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
import { fmtDate, fmtRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Plane, Plus, Clock, CheckCircle2, Loader2, MapPin, Calendar, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { TravelRequestT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  MANAGER_APPROVED: 'info',
  HR_APPROVED: 'info',
  BOOKED: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-600',
  MANAGER_APPROVED: 'bg-sky-500/15 text-sky-600',
  HR_APPROVED: 'bg-teal-500/15 text-teal-600',
  BOOKED: 'bg-violet-500/15 text-violet-600',
  COMPLETED: 'bg-emerald-500/15 text-emerald-600',
  REJECTED: 'bg-rose-500/15 text-rose-600',
}

const statusFlow = ['PENDING', 'MANAGER_APPROVED', 'HR_APPROVED', 'BOOKED', 'COMPLETED']

const transportLabels: Record<string, string> = {
  FLIGHT: '✈️ Flight', TRAIN: '🚆 Train', CAR: '🚗 Car', BUS: '🚌 Bus',
}

export function TravelView() {
  const { currentEmployee } = useApp()
  const [requests, setRequests] = useState<TravelRequestT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [type, setType] = useState('BUSINESS')
  const [destination, setDestination] = useState('')
  const [purpose, setPurpose] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [transport, setTransport] = useState('FLIGHT')
  const [accommodation, setAccommodation] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState('')

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    const scope = ['HR', 'ADMIN', 'MANAGER'].includes(currentEmployee.role) ? 'all' : ''
    const url = scope ? `/api/travel?scope=all` : `/api/travel?employeeId=${currentEmployee.id}`
    try {
      const r = await authedFetch(url).then((r) => r.json())
      setRequests(Array.isArray(r) ? r : [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function create() {
    if (!currentEmployee || !destination || !startDate || !endDate) { toast.error('Fill all fields'); return }
    setSubmitting(true)
    try {
      await authedFetch('/api/travel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, type, destination, purpose, startDate, endDate, transport, accommodation, advanceAmount }),
      })
      toast.success('Travel request submitted'); setOpen(false); setDestination(''); setPurpose(''); setStartDate(''); setEndDate(''); setAdvanceAmount(''); load()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  async function decide(id: string, status: string) {
    await authedFetch('/api/travel', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, approverId: currentEmployee?.id }) })
    toast.success('Travel request updated'); load()
  }

  const isApprover = currentEmployee && ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)
  const pending = requests.filter((r) => r.status === 'PENDING').length
  const approved = requests.filter((r) => ['MANAGER_APPROVED', 'HR_APPROVED', 'BOOKED', 'COMPLETED'].includes(r.status)).length
  const upcoming = requests.filter((r) => new Date(r.startDate) > new Date()).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Travel Requests"
        description="Plan and approve business travel"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Request</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Travel Request</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Type</Label>
                    <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {['BUSINESS', 'CLIENT_VISIT', 'TRAINING', 'CONFERENCE'].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                  <div className="space-y-1.5"><Label>Transport</Label>
                    <Select value={transport} onValueChange={setTransport}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {['FLIGHT', 'TRAIN', 'CAR', 'BUS'].map((t) => <SelectItem key={t} value={t}>{transportLabels[t]}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Destination</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Mumbai" /></div>
                <div className="space-y-1.5"><Label>Purpose</Label><Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="Purpose of travel…" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label>Advance Amount (₹)</Label><Input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="0" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accommodation} onChange={(e) => setAccommodation(e.target.checked)} className="rounded" /> Need accommodation</label>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <MetricStrip
        metrics={[
          { label: 'Total', value: requests.length, sub: 'requests' },
          { label: 'Pending', value: pending, sub: 'awaiting decision', tone: 'warning' },
          { label: 'Approved', value: approved, sub: 'in flight', tone: 'success' },
          { label: 'Upcoming', value: upcoming, sub: 'future travel', tone: 'info' },
        ]}
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={4} /></div>
      ) : requests.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={Plane} title="No travel requests" /></Card>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {requests.map((r, i) => {
              const tone = statusTone[r.status] || 'neutral'
              const stepIdx = statusFlow.indexOf(r.status)
              return (
                <div key={r.id} className="p-3.5 animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="flex items-center gap-3">
                    <StatusDot tone={tone} />
                    <div className="h-8 w-8 rounded-lg bg-primary/8 text-primary grid place-items-center shrink-0"><Plane className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[13px] leading-tight">{r.destination}</p>
                        <Badge variant="outline" className="text-[10px] border-0">{r.type.replace(/_/g, ' ').toLowerCase()}</Badge>
                        <Badge variant="outline" className="text-[10px] border-0">{transportLabels[r.transport]}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.destination}</span>
                        <span className="flex items-center gap-1 tabular-nums"><Calendar className="h-3 w-3" /> {fmtDate(r.startDate, 'd MMM')} → {fmtDate(r.endDate, 'd MMM')}</span>
                        {r.accommodation && <Badge variant="secondary" className="text-[10px] h-4">🏨 Stay</Badge>}
                        {r.advanceAmount > 0 && <span className="tabular-nums">₹{r.advanceAmount} advance</span>}
                        <span>· {fmtRelative(r.appliedAt)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] border-0 shrink-0', statusColors[r.status])}>{r.status.replace(/_/g, ' ').toLowerCase()}</Badge>
                    {isApprover && r.status === 'PENDING' && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="text-[11px] h-7 text-emerald-600 border-emerald-500/30" onClick={() => decide(r.id, 'MANAGER_APPROVED')}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-[11px] h-7 text-rose-600 border-rose-500/30" onClick={() => decide(r.id, 'REJECTED')}>Reject</Button>
                      </div>
                    )}
                  </div>
                  {r.purpose && <p className="text-[11px] text-muted-foreground mt-1.5 ml-[51px] line-clamp-1">{r.purpose}</p>}
                  {/* mini approval timeline */}
                  {r.status !== 'REJECTED' && (
                    <div className="mt-2.5 ml-[51px] flex items-center gap-1">
                      {statusFlow.map((s, idx) => (
                        <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors duration-200', idx <= stepIdx ? (s === 'COMPLETED' ? 'bg-emerald-500' : 'bg-primary') : 'bg-muted')} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
