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
import { PageHeader, EmptyState, RowSkeleton, SectionLabel, StatusDot } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { fmtRelative, fmtDate } from '@/lib/format'
import { Megaphone, Calendar, GraduationCap, Bell, FileText, Users, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AnnouncementT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const categoryConfig: Record<string, { icon: any; color: string }> = {
  POLICY: { icon: FileText, color: 'bg-violet-500/10 text-violet-600' },
  EVENT: { icon: Calendar, color: 'bg-sky-500/10 text-sky-600' },
  HOLIDAY: { icon: Calendar, color: 'bg-amber-500/10 text-amber-600' },
  TRAINING: { icon: GraduationCap, color: 'bg-rose-500/10 text-rose-600' },
  NOTICE: { icon: Bell, color: 'bg-emerald-500/10 text-emerald-600' },
  GENERAL: { icon: Megaphone, color: 'bg-primary/10 text-primary' },
}

const priorityTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'danger',
}

export function AnnouncementsView() {
  const { currentEmployee } = useApp()
  const [items, setItems] = useState<AnnouncementT[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [priority, setPriority] = useState('MEDIUM')

  async function load() {
    setLoading(true)
    try {
      const a = await authedFetch('/api/announcements').then((r) => r.json())
      setItems(Array.isArray(a) ? a : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!title || !content) { toast.error('Title and content required'); return }
    setSubmitting(true)
    try {
      await authedFetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, priority, authorId: currentEmployee?.id, authorName: currentEmployee?.name }),
      })
      toast.success('Announcement published'); setOpen(false); setTitle(''); setContent(''); load()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  const canPublish = currentEmployee && ['HR', 'ADMIN', 'MANAGER'].includes(currentEmployee.role)
  const cats = ['ALL', ...Array.from(new Set(items.map((i) => i.category)))]
  const filtered = filter === 'ALL' ? items : items.filter((i) => i.category === filter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description={`${items.length} company updates`}
        actions={canPublish && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Announcement</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Publish Announcement</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title…" /></div>
                <div className="space-y-1.5"><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Write your announcement…" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {['GENERAL', 'POLICY', 'EVENT', 'HOLIDAY', 'TRAINING', 'NOTICE'].map((c) => <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                  <div className="space-y-1.5"><Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {['LOW', 'MEDIUM', 'HIGH'].map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <SectionLabel className="mr-1">Filter</SectionLabel>
        {cats.map((c) => (
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
            {c === 'ALL' ? 'All' : c.charAt(0) + c.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={4} /></div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={Megaphone} title="No announcements" /></Card>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((a, i) => {
              const cfg = categoryConfig[a.category] || categoryConfig.GENERAL
              const Icon = cfg.icon
              const isHigh = a.priority === 'HIGH'
              return (
                <div
                  key={a.id}
                  className={cn(
                    'relative p-4 animate-rise',
                    isHigh && 'accent-bar-left'
                  )}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('h-9 w-9 rounded-lg grid place-items-center shrink-0', cfg.color)}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <p className="font-semibold text-[14px] leading-snug text-pretty">{a.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusDot tone={priorityTone[a.priority] || 'neutral'} />
                          <Badge variant="outline" className={cn('text-[10px] border-0', isHigh && 'bg-rose-500/15 text-rose-600')}>{a.priority}</Badge>
                          <Badge variant="outline" className="text-[10px] border-0">{a.category.charAt(0) + a.category.slice(1).toLowerCase()}</Badge>
                        </div>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed text-pretty">{a.content}</p>
                      <div className="flex items-center gap-2 mt-2.5 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{a.authorName || 'HR Team'}</span>
                        <span>·</span>
                        <span className="tabular-nums">{fmtRelative(a.publishedAt)}</span>
                        <span>·</span>
                        <span className="tabular-nums">{fmtDate(a.publishedAt, 'd MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
