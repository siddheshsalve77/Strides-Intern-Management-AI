'use client'

import { Card } from '@/components/ui/card'
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend,
} from 'recharts'

const CHART_COLORS = {
  primary: 'oklch(0.55 0.13 170)',
  emerald: 'oklch(0.65 0.15 145)',
  amber: 'oklch(0.7 0.15 60)',
  rose: 'oklch(0.6 0.2 20)',
  violet: 'oklch(0.6 0.18 300)',
  sky: 'oklch(0.6 0.12 230)',
  teal: 'oklch(0.6 0.12 190)',
  zinc: 'oklch(0.6 0.01 240)',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  CREATED: CHART_COLORS.zinc,
  ASSIGNED: CHART_COLORS.sky,
  IN_PROGRESS: CHART_COLORS.primary,
  SUBMITTED: CHART_COLORS.amber,
  UNDER_REVIEW: CHART_COLORS.violet,
  APPROVED: CHART_COLORS.teal,
  COMPLETED: CHART_COLORS.emerald,
}

interface AttendancePoint { date: string; hours: number; status: string; label: string }

export function AttendanceTrendChart({ data }: { data: AttendancePoint[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold">Working Hours Trend</p>
          <p className="text-xs text-muted-foreground">Last 14 days</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS.primary }} />Hours</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 240)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 240)' }} axisLine={false} tickLine={false} domain={[0, 10]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.9 0.01 240)', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value: any, name: any, props: any) => [`${value}h`, props?.payload?.status?.replace('_', ' ') || 'Hours']}
          />
          <Area type="monotone" dataKey="hours" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#colorHours)" dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

interface TaskDist { [key: string]: number }

export function TaskDistributionChart({ data }: { data: TaskDist }) {
  const chartData = Object.entries(data)
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value, key: name }))
  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold">Task Distribution</p>
          <p className="text-xs text-muted-foreground">{total} total tasks</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={160}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
              {chartData.map((entry, i) => <Cell key={i} fill={TASK_STATUS_COLORS[entry.key] || CHART_COLORS.zinc} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.9 0.01 240)', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {chartData.map((d) => (
            <div key={d.key} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: TASK_STATUS_COLORS[d.key] || CHART_COLORS.zinc }} />
              <span className="flex-1 text-muted-foreground truncate">{d.name}</span>
              <span className="font-semibold">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

interface WeekdayData { day: string; hours: number }

export function WeekdayHoursChart({ data }: { data: number[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const chartData = data.map((h, i) => ({ day: days[i], hours: h })).filter((_, i) => i >= 1 && i <= 5)
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold">Avg Hours by Weekday</p>
          <p className="text-xs text-muted-foreground">Productivity pattern</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 240)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 240)' }} axisLine={false} tickLine={false} domain={[0, 10]} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.9 0.01 240)', fontSize: 12 }} formatter={(v: any) => [`${v}h`, 'Avg hours']} cursor={{ fill: 'oklch(0.5 0.02 240 / 0.05)' }} />
          <Bar dataKey="hours" fill={CHART_COLORS.emerald} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

interface PerformanceData {
  overall: number; goalAchievement: number; taskCompletion: number;
  quality: number; attendance: number; managerRating: number;
}

export function PerformanceRadarChart({ data }: { data: PerformanceData }) {
  const chartData = [
    { metric: 'Goals', value: data.goalAchievement, fullMark: 100 },
    { metric: 'Tasks', value: data.taskCompletion, fullMark: 100 },
    { metric: 'Quality', value: data.quality, fullMark: 100 },
    { metric: 'Attendance', value: data.attendance, fullMark: 100 },
    { metric: 'Manager', value: data.managerRating, fullMark: 100 },
    { metric: 'Overall', value: data.overall, fullMark: 100 },
  ]
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={chartData} outerRadius="75%">
        <PolarGrid stroke="oklch(0.85 0.01 240)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: 'oklch(0.4 0.02 240)' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: 'oklch(0.6 0.02 240)' }} axisLine={false} />
        <Radar name="Score" dataKey="value" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.35} strokeWidth={2} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.9 0.01 240)', fontSize: 12 }} formatter={(v: any) => [`${v}%`, 'Score']} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

interface TeamPerfPoint { name: string; overall: number; taskCompletion: number; quality: number }

export function TeamPerformanceChart({ data }: { data: TeamPerfPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'oklch(0.5 0.02 240)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.4 0.02 240)' }} axisLine={false} tickLine={false} width={90} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.9 0.01 240)', fontSize: 12 }} formatter={(v: any) => [`${v}%`, '']} cursor={{ fill: 'oklch(0.5 0.02 240 / 0.05)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="overall" name="Overall" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={20} />
        <Bar dataKey="taskCompletion" name="Tasks" fill={CHART_COLORS.emerald} radius={[0, 4, 4, 0]} maxBarSize={20} />
        <Bar dataKey="quality" name="Quality" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
