'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, SectionLabel } from '@/components/portal/ui-helpers'
import { CelebrationOverlay } from '@/components/portal/celebration'
import { fmtDate, daysUntil } from '@/lib/format'
import { Target, Plus, CheckCircle2, Clock, Loader2, Flag } from 'lucide-react'
import { toast } from 'sonner'
import type { GoalT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

export function GoalsView() {
  const { currentEmployee } = useApp()
  const [goals, setGoals] = useState<GoalT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(0)
  const [celebrateMsg, setCelebrateMsg] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    try {
      const g = await authedFetch(`/api/goals?employeeId=${currentEmployee.id}`).then((r) => r.json())
      setGoals(Array.isArray(g) ? g : [])
    } catch {
      setGoals([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function create() {
    if (!currentEmployee || !title) { toast.error('Title required'); return }
    setSubmitting(true)
    try {
      await authedFetch('/api/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, title, description, target, deadline }),
      })
      toast.success('Goal created'); setOpen(false); setTitle(''); setDescription(''); setTarget(''); setDeadline(''); load()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  async function updateProgress(id: string, progress: number) {
    const goal = goals.find((g) => g.id === id)
    const wasNotCompleted = goal && goal.progress < 100
    await authedFetch(`/api/goals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress, status: progress >= 100 ? 'COMPLETED' : 'ACTIVE' }) })
    if (progress >= 100 && wasNotCompleted) {
      setCelebrateMsg(`Goal Completed! 🎯`)
      setCelebrate((c) => c + 1)
      toast.success('🎉 Goal completed! Great work!')
    }
    load()
  }

  const active = goals.filter((g) => g.status === 'ACTIVE')
  const completed = goals.filter((g) => g.status === 'COMPLETED')
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0
  const dueSoon = active.filter((g) => g.deadline && new Date(g.deadline) < new Date(Date.now() + 14 * 86400000)).length

  return (
    <div className="space-y-6">
      <CelebrationOverlay trigger={celebrate} message={celebrateMsg} />
      <PageHeader
        title="Goals"
        description="Set, track and achieve your career goals"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Goal</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label className="text-[12px]">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Master SQL Development" /></div>
                <div className="space-y-1.5"><Label className="text-[12px]">Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
                <div className="space-y-1.5"><Label className="text-[12px]">Target</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. Complete 3 SQL projects" /></div>
                <div className="space-y-1.5"><Label className="text-[12px]">Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Active Goals', value: active.length, sub: 'in progress', tone: 'info' },
              { label: 'Completed', value: completed.length, sub: 'achievements', tone: 'success' },
              { label: 'Avg Progress', value: `${avgProgress}%`, sub: 'across all goals', tone: avgProgress >= 70 ? 'success' : 'info' },
              { label: 'Due Soon', value: dueSoon, sub: 'within 2 weeks', tone: dueSoon > 0 ? 'warning' : 'default' },
            ]}
          />
        )}
      </div>

      {loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}</div> :
        goals.length === 0 ? <Card><EmptyState icon={Target} title="No goals yet" description="Create your first goal to start tracking progress." /></Card> : (
          <div className="space-y-3">
            <SectionLabel>Goal timeline</SectionLabel>
            {goals.map((g, i) => {
              const isDone = g.status === 'COMPLETED'
              const dUntil = daysUntil(g.deadline)
              const isOverdue = !isDone && dUntil !== null && dUntil < 0
              const isDueSoon = !isDone && dUntil !== null && dUntil >= 0 && dUntil <= 14
              const dotClass = isDone ? 'timeline-dot timeline-dot-done' : 'timeline-dot timeline-dot-now'
              return (
                <div key={g.id} className="timeline-rail animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
                  <span className={dotClass} />
                  <Card className={`p-4 hover:shadow-card transition-all duration-200 ${isOverdue ? 'border-rose-500/40' : ''}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold leading-tight">{g.title}</p>
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${isDone ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>{g.status}</Badge>
                          {g.deadline && (
                            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${isOverdue ? 'bg-rose-500/15 text-rose-600' : isDueSoon ? 'bg-amber-500/15 text-amber-600' : ''}`}>
                              <Clock className="h-3 w-3" />
                              {isOverdue ? 'Overdue' : isDueSoon ? 'Due soon' : 'On track'}
                            </Badge>
                          )}
                        </div>
                        {g.description && <p className="text-[12px] text-muted-foreground mt-1">{g.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[24px] font-bold tabular-nums leading-none">{g.progress}<span className="text-[12px] text-muted-foreground">%</span></p>
                        {g.deadline && <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{fmtDate(g.deadline, 'd MMM')}</p>}
                      </div>
                    </div>
                    {g.target && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2">
                        <Flag className="h-3 w-3" />
                        {g.target}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Progress value={g.progress} className="h-2 flex-1" />
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] tabular-nums" onClick={() => updateProgress(g.id, Math.max(0, g.progress - 10))}>−10</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] tabular-nums" onClick={() => updateProgress(g.id, Math.min(100, g.progress + 10))}>+10</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => updateProgress(g.id, 100)}><CheckCircle2 className="h-3 w-3" />Done</Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
