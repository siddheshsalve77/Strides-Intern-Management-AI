'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { fmtRelative, initials } from '@/lib/format'
import {
  CalendarDays, ListChecks, LifeBuoy, Video, Megaphone, Wallet,
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: string
  action: string
  title: string
  description: string
  actorName: string
  actorPhoto?: string
  timestamp: string
  view?: string
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  LEAVE: { icon: CalendarDays, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  TASK: { icon: ListChecks, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  REQUEST: { icon: LifeBuoy, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  MEETING: { icon: Video, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ANNOUNCEMENT: { icon: Megaphone, color: 'text-primary', bg: 'bg-primary/10' },
  EXPENSE: { icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-500/10' },
}

export function ActivityFeed() {
  const { currentEmployee, setView } = useApp()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentEmployee) return
    const isManagerOrAbove = ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)
    const url = isManagerOrAbove
      ? `/api/activity?scope=org&managerId=${currentEmployee.id}&limit=12`
      : `/api/activity?limit=10`
    fetch(url).then((r) => r.json()).then((a) => { setActivities(a); setLoading(false) }).catch(() => setLoading(false))
  }, [currentEmployee])

  if (loading || activities.length === 0) return null

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold">Recent Activity</p>
          <p className="text-xs text-muted-foreground">Last 7 days · {activities.length} events</p>
        </div>
        <Badge variant="outline" className="text-[10px]">Live</Badge>
      </div>
      <ScrollArea className="h-80 pr-2">
        <div className="space-y-1">
          {activities.map((a) => {
            const cfg = typeConfig[a.type] || typeConfig.TASK
            const Icon = cfg.icon
            return (
              <button
                key={a.id}
                onClick={() => a.view && setView(a.view as any)}
                className="w-full flex items-start gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors"
              >
                <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${cfg.bg} ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{a.actorName}</span>{' '}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{a.title}</p>
                  {a.description && <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{a.description}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-1">{fmtRelative(a.timestamp)}</span>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </Card>
  )
}
