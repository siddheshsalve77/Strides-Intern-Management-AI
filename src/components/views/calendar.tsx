'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader, EmptyState, CompactRow, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtDate } from '@/lib/format'
import { Calendar, Heart, Building2, Sun } from 'lucide-react'
import type { HolidayT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const typeConfig: Record<string, { icon: any; color: string; chip: string }> = {
  PUBLIC: { icon: Sun, color: 'bg-sky-500/10 text-sky-600', chip: 'bg-sky-500' },
  COMPANY: { icon: Building2, color: 'bg-violet-500/10 text-violet-600', chip: 'bg-violet-500' },
  OPTIONAL: { icon: Heart, color: 'bg-amber-500/10 text-amber-600', chip: 'bg-amber-500' },
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function CalendarView() {
  const [holidays, setHolidays] = useState<HolidayT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { authedFetch('/api/holidays').then((r) => r.json()).then((h) => { setHolidays(Array.isArray(h) ? h : []); setLoading(false) }).catch(() => setLoading(false)) }, [])

  // Group by month
  const byMonth: Record<string, HolidayT[]> = {}
  holidays.forEach((h) => {
    const m = new Date(h.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(h)
  })

  const upcoming = holidays.filter((h) => new Date(h.date) >= new Date())
  const next = upcoming[0]
  const daysToNext = next ? Math.ceil((new Date(next.date).getTime() - Date.now()) / 86400000) : null

  // Parse month key → [year, monthIndex]
  const monthKeyParts = (key: string): [number, number] => {
    const [m, y] = key.split(' ')
    return [parseInt(y, 10), new Date(`${m} 1 ${y}`).getMonth()]
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Holiday Calendar" description={`${holidays.length} holidays this year`} />

      {/* Next Holiday hero */}
      {next && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground p-6 shadow-card animate-rise">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-primary-foreground/70">Next Holiday</p>
              <h2 className="text-[26px] font-bold mt-1 tracking-tight">{next.name}</h2>
              <p className="text-[12px] text-primary-foreground/80 mt-1 tabular-nums">{fmtDate(next.date, 'EEEE, d MMMM yyyy')}</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm">
              <p className="text-[44px] font-bold leading-none tabular-nums">{daysToNext}</p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-primary-foreground/70 mt-1">days to go</p>
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        <span className="section-label">Legend</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> Public</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Company</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Optional</span>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 animate-skeleton">
              <div className="h-4 w-32 bg-muted rounded mb-4" />
              <div className="grid grid-cols-7 gap-2">{Array.from({ length: 35 }).map((_, j) => <div key={j} className="h-9 bg-muted/50 rounded" />)}</div>
            </Card>
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <Card><EmptyState icon={Calendar} title="No holidays" description="Holidays will appear here once published." /></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byMonth).map(([month, items], idx) => {
            const [year, monthIdx] = monthKeyParts(month)
            const cells = monthCells(year, monthIdx)
            const holidayByDay: Record<number, HolidayT> = {}
            items.forEach((h) => {
              const d = new Date(h.date).getDate()
              holidayByDay[d] = h
            })
            return (
              <div key={month} className="animate-rise" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="section-label">{month}</p>
                  <Badge variant="outline" className="text-[10px] tabular-nums">{items.length} holiday{items.length !== 1 ? 's' : ''}</Badge>
                </div>

                {/* Dense monthly grid */}
                <Card className="p-4 shadow-card">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {WEEKDAYS.map((w, i) => (
                      <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{w}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, i) => {
                      if (day === null) return <div key={i} className="aspect-square" />
                      const holiday = holidayByDay[day]
                      const isToday =
                        new Date().getFullYear() === year &&
                        new Date().getMonth() === monthIdx &&
                        new Date().getDate() === day
                      const cfg = holiday ? typeConfig[holiday.type] || typeConfig.PUBLIC : null
                      return (
                        <div
                          key={i}
                          className={`aspect-square rounded-md grid place-items-center text-[12px] tabular-nums relative transition-colors ${
                            holiday
                              ? `${cfg!.color} font-semibold`
                              : 'text-muted-foreground/70 hover:bg-muted/50'
                          } ${isToday ? 'ring-1 ring-primary' : ''}`}
                          title={holiday?.name}
                        >
                          {day}
                          {holiday && (
                            <span className={`absolute bottom-1 h-1 w-1 rounded-full ${cfg!.chip}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Holiday entries as compact rows with date chip */}
                <div className="mt-2 p-1">
                  {items.map((h) => {
                    const cfg = typeConfig[h.type] || typeConfig.PUBLIC
                    const Icon = cfg.icon
                    const isPast = new Date(h.date) < new Date()
                    return (
                      <CompactRow
                        key={h.id}
                        leading={
                          <div className="flex flex-col items-center justify-center h-10 w-10 rounded-md bg-primary/8 text-primary shrink-0">
                            <span className="text-[8px] font-semibold uppercase">{fmtDate(h.date, 'MMM')}</span>
                            <span className="text-[15px] font-bold leading-none tabular-nums">{fmtDate(h.date, 'd')}</span>
                          </div>
                        }
                        title={
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold">{h.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${cfg.color}`}>{h.type}</Badge>
                          </div>
                        }
                        subtitle={
                          <span className="text-[11px] text-muted-foreground">
                            {fmtDate(h.date, 'EEEE')}{h.description ? ` · ${h.description}` : ''}
                          </span>
                        }
                        trailing={
                          <div className={`h-7 w-7 rounded-md grid place-items-center shrink-0 ${cfg.color} ${isPast ? 'opacity-50' : ''}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        }
                        className={isPast ? 'opacity-60' : ''}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
