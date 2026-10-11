'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

// ============================================================
// STRIDES ONE — Design System Primitives
// Enterprise OS components for consistent information density.
// ============================================================

// ────────────────────────────────────────────────────────────
// STAT CARDS
// ────────────────────────────────────────────────────────────

// Compact KPI — minimal, for secondary metrics
export function StatCard({
  label, value, sub, icon: Icon, accent = 'primary', trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  accent?: 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'teal'
  trend?: { dir: 'up' | 'down'; value: string }
}) {
  const tiles: Record<string, string> = {
    primary: 'icon-tile-teal',
    emerald: 'icon-tile-emerald',
    amber: 'icon-tile-amber',
    rose: 'icon-tile-rose',
    violet: 'icon-tile-violet',
    sky: 'icon-tile-electric',
    teal: 'icon-tile-teal',
  }
  return (
    <Card className="card-premium card-premium-accent p-4 hover-lift border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label">{label}</p>
          <p className="text-[22px] font-bold tracking-tight mt-1 leading-none tabular-nums">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>}
          {trend && (
            <p className={`text-[10px] mt-1.5 font-semibold flex items-center gap-0.5 tabular-nums ${trend.dir === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.dir === 'up' ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && <div className={cn('h-9 w-9 rounded-xl grid place-items-center shrink-0', tiles[accent])}>
          <Icon className="h-4 w-4" />
        </div>}
      </div>
    </Card>
  )
}

// Trend KPI — with sparkline-style indicator
export function TrendStatCard({
  label, value, sub, trend, icon: Icon, accent = 'primary',
}: {
  label: string
  value: string | number
  sub?: string
  trend?: { dir: 'up' | 'down'; value: string; pct?: number }
  icon?: LucideIcon
  accent?: 'primary' | 'emerald' | 'amber' | 'rose' | 'violet'
}) {
  return (
    <Card className="p-4 hover:shadow-card transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />}
      </div>
      <p className="text-[26px] font-bold tracking-tight leading-none tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {trend && (
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums', trend.dir === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600')}>
            {trend.dir === 'up' ? '↑' : '↓'} {trend.value}
          </span>
        )}
        {sub && <span className="text-[11px] text-muted-foreground truncate">{sub}</span>}
      </div>
    </Card>
  )
}

// Status KPI — colored left border for quick scanning
export function StatusStatCard({
  label, value, sub, status = 'info',
}: {
  label: string
  value: string | number
  sub?: string
  status?: 'success' | 'warning' | 'danger' | 'info'
}) {
  const colors: Record<string, string> = {
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-rose-500',
    info: 'border-l-primary',
  }
  const valueColors: Record<string, string> = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    info: 'text-primary',
  }
  return (
    <Card className={cn('p-4 border-l-2', colors[status])}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
      <p className={cn('text-[22px] font-bold tracking-tight mt-1 leading-none tabular-nums', valueColors[status])}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </Card>
  )
}

// Action KPI — clickable card with action hint
export function ActionStatCard({
  label, value, sub, icon: Icon, accent = 'primary', onClick,
}: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  accent?: 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'teal'
  onClick?: () => void
}) {
  const accents: Record<string, string> = {
    primary: 'bg-primary/8 text-primary group-hover:bg-primary/12',
    emerald: 'bg-emerald-500/8 text-emerald-600 group-hover:bg-emerald-500/12',
    amber: 'bg-amber-500/8 text-amber-600 group-hover:bg-amber-500/12',
    rose: 'bg-rose-500/8 text-rose-600 group-hover:bg-rose-500/12',
    violet: 'bg-violet-500/8 text-violet-600 group-hover:bg-violet-500/12',
    sky: 'bg-sky-500/8 text-sky-600 group-hover:bg-sky-500/12',
    teal: 'bg-teal-500/8 text-teal-600 group-hover:bg-teal-500/12',
  }
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      onClick={onClick}
      className="group text-left rounded-lg border border-border bg-card p-4 hover:shadow-card hover:border-border/60 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div className={cn('h-8 w-8 rounded-lg grid place-items-center shrink-0 transition-colors', accents[accent])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium truncate">{label}</p>
          <p className="text-[18px] font-bold tracking-tight mt-0.5 leading-none tabular-nums">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>}
        </div>
      </div>
    </motion.button>
  )
}

// ────────────────────────────────────────────────────────────
// METRIC STRIP — horizontal KPI band (not a card grid)
// ────────────────────────────────────────────────────────────
export function MetricStrip({
  metrics, className,
}: {
  metrics: { label: string; value: string | number; sub?: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }[]
  className?: string
}) {
  return (
    <div className={cn('metric-strip', className)}>
      {metrics.map((m, i) => {
        const toneColor =
          m.tone === 'success' ? 'text-emerald-600' :
          m.tone === 'warning' ? 'text-amber-600' :
          m.tone === 'danger' ? 'text-rose-600' :
          m.tone === 'info' ? 'text-primary' : ''
        return (
          <div key={i} className="min-w-0">
            <p className="section-label">{m.label}</p>
            <p className={cn('text-[20px] font-bold tracking-tight mt-0.5 leading-none tabular-nums', toneColor)}>{m.value}</p>
            {m.sub && <p className="text-[10px] text-muted-foreground mt-1 truncate">{m.sub}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// TIMELINE — vertical rail with dots
// ────────────────────────────────────────────────────────────
export function Timeline({
  items,
}: {
  items: { dot?: 'default' | 'done' | 'now'; title: string; meta?: string; body?: React.ReactNode }[]
}) {
  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <div key={i} className="timeline-rail animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
          <span className={cn('timeline-dot', it.dot === 'done' && 'timeline-dot-done', it.dot === 'now' && 'timeline-dot-now')} />
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-medium leading-tight">{it.title}</p>
              {it.meta && <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{it.meta}</span>}
            </div>
            {it.body && <div className="mt-1 text-[11px] text-muted-foreground">{it.body}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// COMPACT ROW — dense list item
// ────────────────────────────────────────────────────────────
export function CompactRow({
  leading, title, subtitle, trailing, onClick, className,
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const Tag = onClick ? motion.button : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn('compact-row w-full text-left', className)}
      {...(onClick ? { whileHover: { x: 1 }, whileTap: { scale: 0.998 } } : {})}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-tight truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
    </Tag>
  )
}

// ────────────────────────────────────────────────────────────
// STATUS DOT — semantic indicator
// ────────────────────────────────────────────────────────────
export function StatusDot({ tone = 'neutral', label }: { tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('status-dot', `status-dot-${tone}`)} />
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION LABEL — uppercase micro-eyebrow
// ────────────────────────────────────────────────────────────
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('section-label', className)}>{children}</p>
}

// ────────────────────────────────────────────────────────────
// KBD — keyboard key
// ────────────────────────────────────────────────────────────
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

// ────────────────────────────────────────────────────────────
// PAGE HEADER — Premium, intentional, with optional accent
// ────────────────────────────────────────────────────────────
export function PageHeader({
  title, description, actions, breadcrumb,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5 animate-fade-in-up">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1.5">{breadcrumb}</div>}
        <h2 className="text-[20px] lg:text-[22px] font-bold tracking-tight leading-tight">{title}</h2>
        {description && <p className="text-[12px] text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// EMPTY STATE — Premium, designed, with semantic icon tile
// ────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon, title, description, action, accent = 'teal',
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  accent?: 'teal' | 'emerald' | 'amber' | 'rose' | 'violet' | 'electric' | 'ai'
}) {
  const tiles: Record<string, string> = {
    teal: 'icon-tile-teal',
    emerald: 'icon-tile-emerald',
    amber: 'icon-tile-amber',
    rose: 'icon-tile-rose',
    violet: 'icon-tile-violet',
    electric: 'icon-tile-electric',
    ai: 'icon-tile-ai',
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
      <div className={cn('h-14 w-14 rounded-2xl grid place-items-center mb-4', tiles[accent])}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-[14px] font-semibold tracking-tight">{title}</p>
      {description && <p className="text-[12px] text-muted-foreground mt-1.5 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// SECTION CARD — Premium with optional accent edge
// ────────────────────────────────────────────────────────────
export function SectionCard({
  title, description, action, children, className, accent,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  accent?: 'teal' | 'ai' | 'warm' | 'violet' | 'success' | 'sunset'
}) {
  const accentClass = accent ? `card-premium-accent${accent !== 'teal' ? `-${accent}` : ''}` : ''
  return (
    <Card className={cn('card-premium', accentClass, 'p-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {title && <p className="text-[13px] font-semibold tracking-tight">{title}</p>}
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// PREMIUM PROGRESS BAR — gradient fill with soft glow
// ────────────────────────────────────────────────────────────
export function ProgressBar({
  value, max = 100, tone = 'primary', className, showLabel = false,
}: {
  value: number
  max?: number
  tone?: 'primary' | 'ai' | 'success' | 'warm' | 'violet'
  className?: string
  showLabel?: boolean
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const fillClass = `progress-fill-${tone}`
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 progress-track-premium">
        <div className={cn('h-full', fillClass)} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-[10px] font-semibold tabular-nums text-muted-foreground w-9 text-right">{Math.round(pct)}%</span>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// PREMIUM STATUS PILL — semantic chip
// ────────────────────────────────────────────────────────────
export function Pill({
  children, tone = 'neutral', icon: Icon,
}: {
  children: React.ReactNode
  tone?: 'teal' | 'emerald' | 'amber' | 'coral' | 'rose' | 'violet' | 'indigo' | 'electric' | 'neutral'
  icon?: LucideIcon
}) {
  return (
    <span className={cn('pill', `pill-${tone}`)}>
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {children}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// SKELETON LOADERS — premium shimmer
// ────────────────────────────────────────────────────────────
export function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
    <div className="h-3 w-20 skeleton-premium mb-2" />
    <div className="h-6 w-16 skeleton-premium" />
  </div>
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg card-premium p-4 border-0">
      <div className="h-3 w-20 skeleton-premium mb-2" />
      <div className="h-6 w-16 skeleton-premium" />
    </div>
  )
}

// List skeleton — for table/row loading
export function RowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="compact-row">
          <div className="h-8 w-8 rounded-lg skeleton-premium shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 skeleton-premium" />
            <div className="h-2.5 w-20 skeleton-premium" />
          </div>
          <div className="h-3 w-10 skeleton-premium" />
        </div>
      ))}
    </div>
  )
}

// Metric strip skeleton
export function MetricStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="metric-strip">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="h-2.5 w-16 skeleton-premium mb-1.5" />
          <div className="h-5 w-12 skeleton-premium" />
        </div>
      ))}
    </div>
  )
}
