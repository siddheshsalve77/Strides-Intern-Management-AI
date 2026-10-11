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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, MetricStrip, EmptyState, RowSkeleton, StatusDot, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtDate, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Wallet, Plus, Clock, CheckCircle2, Loader2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { ExpenseT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  MANAGER_APPROVED: 'info',
  FINANCE_APPROVED: 'info',
  PROCESSED: 'success',
  REJECTED: 'danger',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-600',
  MANAGER_APPROVED: 'bg-sky-500/15 text-sky-600',
  FINANCE_APPROVED: 'bg-teal-500/15 text-teal-600',
  PROCESSED: 'bg-emerald-500/15 text-emerald-600',
  REJECTED: 'bg-rose-500/15 text-rose-600',
}

export function ExpensesView() {
  const { currentEmployee } = useApp()
  const [expenses, setExpenses] = useState<ExpenseT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [category, setCategory] = useState('TRAVEL')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    const scope = ['HR', 'ADMIN'].includes(currentEmployee.role) ? 'all' : ''
    const url = scope ? `/api/expenses?scope=all` : `/api/expenses?employeeId=${currentEmployee.id}`
    try {
      const e = await authedFetch(url).then((r) => r.json())
      setExpenses(Array.isArray(e) ? e : [])
    } catch {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function create() {
    if (!currentEmployee || !amount) { toast.error('Amount required'); return }
    setSubmitting(true)
    try {
      await authedFetch('/api/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, category, amount, description, date }),
      })
      toast.success('Expense submitted'); setOpen(false); setAmount(''); setDescription(''); load()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  async function approve(id: string, status: string) {
    await authedFetch('/api/expenses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    toast.success('Updated'); load()
  }

  const isApprover = currentEmployee && ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)
  const total = expenses.filter((e) => e.status === 'PROCESSED').reduce((s, e) => s + e.amount, 0)
  const pending = expenses.filter((e) => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0)
  const thisMonth = expenses.filter((e) => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses & Reimbursement"
        description="Submit and track your expense claims"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Expense</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Submit Expense Claim</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['TRAVEL', 'FOOD', 'CLIENT', 'TRANSPORT', 'OTHER'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <MetricStrip
        metrics={[
          { label: 'Total Claims', value: expenses.length, sub: 'submitted' },
          { label: 'Pending', value: inr(pending), sub: 'awaiting approval', tone: 'warning' },
          { label: 'Processed', value: inr(total), sub: 'reimbursed', tone: 'success' },
          { label: 'This Month', value: inr(thisMonth), sub: 'spend', tone: 'info' },
        ]}
      />

      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border surface-sunken">
          <div className="flex items-center gap-2">
            <SectionLabel>All Claims</SectionLabel>
            <span className="text-[10px] text-muted-foreground tabular-nums">{expenses.length}</span>
          </div>
        </div>
        {loading ? (
          <div className="p-2"><RowSkeleton count={5} /></div>
        ) : expenses.length === 0 ? (
          <EmptyState icon={Wallet} title="No expenses" description="Submit your first expense claim." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="surface-sunken hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wide h-8">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide h-8">Category</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide h-8">Description</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide h-8">Date</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide h-8 text-right">Amount</TableHead>
                {isApprover && <TableHead className="text-[10px] uppercase tracking-wide h-8 text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e, i) => (
                <TableRow key={e.id} className="animate-rise" style={{ animationDelay: `${i * 0.03}s` }}>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <StatusDot tone={statusTone[e.status] || 'neutral'} />
                      <span className="text-[11px] text-muted-foreground">{e.status.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5"><Badge variant="outline" className="text-[10px] border-0">{e.category}</Badge></TableCell>
                  <TableCell className="py-2.5 text-[12px] max-w-[220px] truncate">{e.description || '—'}</TableCell>
                  <TableCell className="py-2.5 text-[12px] tabular-nums text-muted-foreground">{fmtDate(e.date, 'd MMM yyyy')}</TableCell>
                  <TableCell className="py-2.5 text-right font-medium text-[13px] tabular-nums">{inr(e.amount)}</TableCell>
                  {isApprover && (
                    <TableCell className="py-2.5 text-right">
                      {e.status === 'PENDING' && (
                        <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={() => approve(e.id, 'MANAGER_APPROVED')}>Approve</Button>
                      )}
                      {e.status === 'MANAGER_APPROVED' && (
                        <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={() => approve(e.id, 'FINANCE_APPROVED')}>Finance</Button>
                      )}
                      {e.status === 'FINANCE_APPROVED' && (
                        <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={() => approve(e.id, 'PROCESSED')}>Process</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
