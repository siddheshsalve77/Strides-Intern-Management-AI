'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fmtDate } from '@/lib/format'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeatmapDay {
  date: string
  hours: number
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-500',
  LATE: 'bg-amber-500',
  HALF_DAY: 'bg-yellow-400',
  ABSENT: 'bg-rose-500',
  LEAVE: 'bg-violet-500',
  HOLIDAY: 'bg-sky-400',
  WFH: 'bg-teal-500',
  WEEKEND: 'bg-zinc-200 dark:bg-zinc-800',
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  ABSENT: 'Absent',
  LEAVE: 'On Leave',
  HOLIDAY: 'Holiday',
  WFH: 'Work From Home',
  WEEKEND: 'Weekend',
}

export function AttendanceHeatmap({ data }: { data: HeatmapDay[] }) {
  const [monthOffset, setMonthOffset] = useState(0)

  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const dayMap = useMemo(() => {
    const m: Record<string, HeatmapDay> = {}
    data.forEach((d) => { m[d.date] = d })
    return m
  }, [data])

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Build calendar grid
  const cells: (HeatmapDay | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push(dayMap[dateStr] || { date: dateStr, hours: 0, status: 'ABSENT' })
  }

  // Stats for the month
  const monthDays = cells.filter((c): c is HeatmapDay => c !== null)
  const present = monthDays.filter((d) => ['PRESENT', 'LATE'].includes(d.status)).length
  const late = monthDays.filter((d) => d.status === 'LATE').length
  const absent = monthDays.filter((d) => d.status === 'ABSENT').length
  const totalHours = monthDays.reduce((s, d) => s + d.hours, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold">Attendance Heatmap</p>
          <p className="text-xs text-muted-foreground">{monthName}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setMonthOffset((o) => o - 1)} disabled={monthOffset <= -11}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMonthOffset(0)} disabled={monthOffset === 0}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setMonthOffset((o) => o + 1)} disabled={monthOffset >= 0}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (cell === null) return <div key={i} />
          const day = parseInt(cell.date.split('-')[2], 10)
          const isToday = cell.date === new Date().toISOString().split('T')[0]
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={`aspect-square rounded-md grid place-items-center text-[10px] font-medium cursor-default transition-transform hover:scale-110 ${STATUS_COLORS[cell.status] || 'bg-zinc-200'} ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''} ${cell.status === 'WEEKEND' ? 'text-muted-foreground' : 'text-white'}`}
                >
                  {day}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{fmtDate(cell.date, 'EEE, d MMM')}</p>
                <p className="text-muted-foreground">{STATUS_LABELS[cell.status] || cell.status}{cell.hours > 0 ? ` · ${cell.hours}h` : ''}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      {/* Legend + stats */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ['PRESENT', 'Present'], ['LATE', 'Late'], ['WFH', 'WFH'], ['ABSENT', 'Absent'], ['LEAVE', 'Leave'], ['WEEKEND', 'Weekend'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_COLORS[key]}`} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="outline" className="text-[10px] gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{present} present</Badge>
          {late > 0 && <Badge variant="outline" className="text-[10px] gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{late} late</Badge>}
          <span className="text-muted-foreground">{totalHours.toFixed(1)}h total</span>
        </div>
      </div>
    </Card>
  )
}
