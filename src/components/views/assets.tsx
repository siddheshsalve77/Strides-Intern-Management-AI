'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader, MetricStrip, EmptyState, RowSkeleton, StatusDot, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Laptop, Monitor, Mouse, Keyboard, Smartphone, IdCard, CheckCircle2, Package } from 'lucide-react'
import type { AssetT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const assetIcons: Record<string, any> = { Laptop, Monitor, Mouse, Keyboard, Smartphone, 'ID card': IdCard }

export function AssetsView() {
  const { currentEmployee } = useApp()
  const [assets, setAssets] = useState<AssetT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentEmployee) return
    authedFetch(`/api/assets?employeeId=${currentEmployee.id}`)
      .then((r) => r.json())
      .then((a) => { setAssets(Array.isArray(a) ? a : []); setLoading(false) })
      .catch(() => { setAssets([]); setLoading(false) })
  }, [currentEmployee])

  const active = assets.filter((a) => a.status === 'ACTIVE').length
  const categories = Array.from(new Set(assets.map((a) => a.category))).length

  return (
    <div className="space-y-6">
      <PageHeader title="My Assets" description="Company assets issued to you" />

      <MetricStrip
        metrics={[
          { label: 'Total Assets', value: assets.length, sub: 'issued to you' },
          { label: 'Active', value: active, sub: 'in use', tone: 'success' },
          { label: 'Categories', value: categories, sub: 'types' },
        ]}
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={4} /></div>
      ) : assets.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={Package} title="No assets assigned" description="Assets issued to you will appear here." /></Card>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border surface-sunken flex items-center justify-between">
            <SectionLabel>Hardware Inventory</SectionLabel>
            <span className="text-[10px] text-muted-foreground tabular-nums">{assets.length} items</span>
          </div>
          <div className="divide-y divide-border">
            {assets.map((a, i) => {
              const Icon = assetIcons[a.name] || Package
              const isActive = a.status === 'ACTIVE'
              return (
                <div key={a.id} className="p-3.5 flex items-center gap-3 animate-rise" style={{ animationDelay: `${i * 0.04}s` }}>
                  <StatusDot tone={isActive ? 'success' : 'neutral'} />
                  <div className={cn('h-9 w-9 rounded-lg grid place-items-center shrink-0', isActive ? 'bg-primary/8 text-primary' : 'bg-muted text-muted-foreground')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[13px] leading-tight">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{a.model || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">Asset ID</p>
                    <p className="text-[11px] font-mono tabular-nums">{a.assetId}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Issued</p>
                    <p className="text-[11px] tabular-nums">{fmtDate(a.issuedAt, 'd MMM yyyy')}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] border-0 shrink-0', isActive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-zinc-400/15 text-zinc-500')}>{a.status}</Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
