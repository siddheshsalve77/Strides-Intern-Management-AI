'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts'
import { Target, TrendingUp } from 'lucide-react'
import type { GoalT } from '@/lib/types'

export function GoalProgressChart({ goals }: { goals: GoalT[] }) {
  if (!goals || goals.length === 0) {
    return (
      <Card className="p-5">
        <p className="font-semibold mb-1 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Goal Progress</p>
        <p className="text-xs text-muted-foreground mb-4">Track your goals visually</p>
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No active goals to display
        </div>
      </Card>
    )
  }

  const active = goals.filter((g) => g.status === 'ACTIVE')
  const completed = goals.filter((g) => g.status === 'COMPLETED')
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0

  const chartData = goals.slice(0, 6).map((g) => ({
    name: g.title.length > 12 ? g.title.substring(0, 12) + '…' : g.title,
    progress: g.progress,
    completed: g.progress >= 100,
  }))

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Goal Progress</p>
          <p className="text-xs text-muted-foreground">{active.length} active · {completed.length} completed · {avgProgress}% avg</p>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1"><TrendingUp className="h-3 w-3" /> {avgProgress}%</Badge>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'oklch(0.5 0.02 240)' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: 'oklch(0.5 0.02 240)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.9 0.01 240)', fontSize: 12 }} formatter={(v: any) => [`${v}%`, 'Progress']} cursor={{ fill: 'oklch(0.5 0.02 240 / 0.05)' }} />
          <Bar dataKey="progress" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.completed ? 'oklch(0.65 0.15 145)' : 'oklch(0.55 0.13 170)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Goal list with progress bars */}
      <div className="mt-4 pt-4 border-t space-y-2.5">
        {goals.slice(0, 4).map((g) => (
          <div key={g.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium truncate flex-1">{g.title}</span>
              <span className={`text-xs ml-2 ${g.progress >= 100 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>{g.progress}%</span>
            </div>
            <Progress value={g.progress} className="h-1.5" />
          </div>
        ))}
      </div>
    </Card>
  )
}
