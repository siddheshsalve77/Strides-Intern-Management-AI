'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader, EmptyState, RowSkeleton, SectionLabel, StatusDot } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { fmtRelative } from '@/lib/format'
import { Bell, CheckCheck, ListChecks, CalendarDays, LifeBuoy, Megaphone, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import type { NotificationT } from '@/lib/types'
import { toast } from 'sonner'
import { authedFetch } from '@/lib/firebase-auth'

const typeIcons: Record<string, any> = {
  TASK: ListChecks, LEAVE: CalendarDays, REQUEST: LifeBuoy, ANNOUNCEMENT: Megaphone,
  PERFORMANCE: TrendingUp, DEADLINE: AlertCircle, INFO: Bell,
}
const typeColors: Record<string, string> = {
  TASK: 'bg-sky-500/10 text-sky-600', LEAVE: 'bg-amber-500/10 text-amber-600',
  REQUEST: 'bg-violet-500/10 text-violet-600', ANNOUNCEMENT: 'bg-teal-500/10 text-teal-600',
  PERFORMANCE: 'bg-emerald-500/10 text-emerald-600', DEADLINE: 'bg-rose-500/10 text-rose-600', INFO: 'bg-primary/10 text-primary',
}
const typeTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  TASK: 'info', LEAVE: 'warning', REQUEST: 'info', ANNOUNCEMENT: 'success',
  PERFORMANCE: 'success', DEADLINE: 'danger', INFO: 'info',
}

export function NotificationsView() {
  const { currentEmployee, setView } = useApp()
  const [notifs, setNotifs] = useState<NotificationT[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  async function load() {
    if (!currentEmployee) return
    try {
      const n = await authedFetch(`/api/notifications?employeeId=${currentEmployee.id}`).then((r) => r.json())
      setNotifs(Array.isArray(n) ? n : [])
    } catch {
      setNotifs([])
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [currentEmployee])

  async function markAllRead() {
    if (!currentEmployee) return
    await authedFetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: currentEmployee.id, action: 'READ_ALL' }) })
    toast.success('All marked as read'); load()
  }

  async function markRead(id: string) {
    await authedFetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'READ' }) })
    load()
  }

  const types = ['ALL', ...Array.from(new Set(notifs.map((n) => n.type)))]
  const filtered = filter === 'ALL' ? notifs : notifs.filter((n) => n.type === filter)
  const unread = notifs.filter((n) => !n.read).length

  // Group by today vs earlier
  const todayKey = new Date().toDateString()
  const today = filtered.filter((n) => new Date(n.createdAt).toDateString() === todayKey)
  const earlier = filtered.filter((n) => new Date(n.createdAt).toDateString() !== todayKey)

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description={`${notifs.length} notifications · ${unread} unread`}
        actions={<Button variant="outline" size="sm" className="gap-2" onClick={markAllRead} disabled={!unread}><CheckCheck className="h-4 w-4" /> Mark all read</Button>} />

      <div className="flex flex-wrap items-center gap-1.5">
        <SectionLabel className="mr-1">Filter</SectionLabel>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200',
              filter === t
                ? 'text-white border-transparent shadow-card'
                : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground press-tactile'
            )}
            style={filter === t ? { background: 'var(--gradient-primary)' } : undefined}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={5} /></div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={Bell} title="No notifications" /></Card>
      ) : (
        <div className="space-y-5">
          {today.length > 0 && (
            <section>
              <SectionLabel className="mb-2 px-1">Today</SectionLabel>
              <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
                <div className="divide-y divide-border">
                  {today.map((n, i) => <NotifRow key={n.id} n={n} i={i} onMarkRead={markRead} />)}
                </div>
              </div>
            </section>
          )}
          {earlier.length > 0 && (
            <section>
              <SectionLabel className="mb-2 px-1">Earlier</SectionLabel>
              <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
                <div className="divide-y divide-border">
                  {earlier.map((n, i) => <NotifRow key={n.id} n={n} i={i} onMarkRead={markRead} />)}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function NotifRow({ n, i, onMarkRead }: { n: NotificationT; i: number; onMarkRead: (id: string) => void }) {
  const Icon = typeIcons[n.type] || Bell
  return (
    <div
      className={cn(
        'relative p-3.5 animate-rise',
        !n.read && 'accent-bar-left bg-primary/[0.02]'
      )}
      style={{ animationDelay: `${i * 0.03}s` }}
    >
      <div className="flex items-start gap-3">
        <StatusDot tone={typeTone[n.type] || 'info'} />
        <div className={cn('h-8 w-8 rounded-lg grid place-items-center shrink-0', typeColors[n.type] || typeColors.INFO)}><Icon className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-[13px] leading-snug', !n.read ? 'font-semibold' : 'font-medium text-muted-foreground')}>{n.title}</p>
            {!n.read && <span className="h-1.5 w-1.5 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--gradient-warm)', boxShadow: '0 0 6px oklch(0.65 0.16 25 / 0.5)' }} />}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 tabular-nums"><Clock className="h-2.5 w-2.5" /> {fmtRelative(n.createdAt)}</span>
            <Badge variant="outline" className="text-[10px] border-0">{n.type}</Badge>
            {!n.read && <button onClick={() => onMarkRead(n.id)} className="text-[10px] text-primary hover:underline ml-auto">Mark read</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
