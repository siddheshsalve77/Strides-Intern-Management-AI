'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, Loader2 } from 'lucide-react'
import { authedFetch } from '@/lib/firebase-auth'

interface TrendPoint {
  week: string
  label: string
  completed: number
  created: number
  submitted: number
}

interface TooltipPayload {
  payload: TrendPoint
  value: number
  name: string
  color: string
  dataKey: string
}

export function TaskCompletionTrend({ compact = false }: { compact?: boolean }) {
  const { currentEmployee } = useApp()
  const [data, setData] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const initial = stored === 'dark' || stored === 'light' ? stored : (mq.matches ? 'dark' : 'light')
    const t = setTimeout(() => setTheme(initial as 'light' | 'dark'), 0)
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => { clearTimeout(t); obs.disconnect() }
  }, [])

  useEffect(() => {
    if (!currentEmployee) return
    let cancelled = false
    authedFetch(`/api/tasks/trend?employeeId=${currentEmployee.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentEmployee])

  const totalCompleted = data.reduce((s, d) => s + d.completed, 0)
  const totalCreated = data.reduce((s, d) => s + d.created, 0)
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0

  // Theme-aware colors
  const isDark = theme === 'dark'
  const axisColor = isDark ? 'oklch(0.7 0.02 240)' : 'oklch(0.5 0.02 240)'
  const gridColor = isDark ? 'oklch(0.3 0.02 240 / 0.5)' : 'oklch(0.9 0.01 240)'
  const completedColor = isDark ? 'oklch(0.65 0.15 145)' : 'oklch(0.55 0.15 145)'
  const createdColor = isDark ? 'oklch(0.6 0.13 170)' : 'oklch(0.55 0.13 170)'
  const submittedColor = isDark ? 'oklch(0.7 0.15 60)' : 'oklch(0.65 0.15 60)'

  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${gridColor}`,
    background: isDark ? 'oklch(0.21 0.015 240)' : '#fff',
    color: isDark ? 'oklch(0.97 0.005 240)' : 'oklch(0.21 0.02 240)',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Task Completion Trend</p>
          <p className="text-xs text-muted-foreground">Last 8 weeks · {totalCompleted} completed · {completionRate}% rate</p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: completedColor }} /> Completed
        </Badge>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          No task data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={compact ? 180 : 220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={completedColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={completedColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={createdColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={createdColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSubmitted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={submittedColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={submittedColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              formatter={(value: number, name: string) => [`${value} ${name}`, name.charAt(0).toUpperCase() + name.slice(1)]}
              labelFormatter={(_label: string, payload: TooltipPayload[]) => {
                const p = payload[0]?.payload
                return p ? `Week of ${p.label}` : ''
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            <Area type="monotone" dataKey="created" name="Created" stroke={createdColor} strokeWidth={2} fill="url(#gradCreated)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="submitted" name="Submitted" stroke={submittedColor} strokeWidth={2} fill="url(#gradSubmitted)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="completed" name="Completed" stroke={completedColor} strokeWidth={2.5} fill="url(#gradCompleted)" dot={{ r: 3, fill: completedColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
