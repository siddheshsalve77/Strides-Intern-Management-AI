'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, RowSkeleton, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtDateTime, fmtRelative } from '@/lib/format'
import { ScrollText, User, FileEdit, Check, X, Search, Database } from 'lucide-react'
import type { AuditLogT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const actionIcons: Record<string, any> = {
  APPROVE_LEAVE: Check, ASSIGN_TASK: FileEdit, PUBLISH_ANNOUNCEMENT: ScrollText, REJECT: X,
}

const actionTone: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  APPROVE_LEAVE: 'success',
  ASSIGN_TASK: 'info',
  PUBLISH_ANNOUNCEMENT: 'info',
  REJECT: 'danger',
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditLogT[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  useEffect(() => { authedFetch('/api/audit').then((r) => r.json()).then((l) => { setLogs(Array.isArray(l) ? l : []); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const actions = ['ALL', ...Array.from(new Set(logs.map((l) => l.action)))]
  const distinctActors = new Set(logs.map((l) => l.actorName)).size
  const distinctEntities = new Set(logs.map((l) => l.entity)).size

  const filtered = logs.filter((l) =>
    (actionFilter === 'ALL' || l.action === actionFilter) &&
    (!search || l.actorName.toLowerCase().includes(search.toLowerCase()) || l.details.toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="System activity & compliance trail" />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Total Events', value: logs.length, sub: 'all recorded activity', tone: 'info' },
              { label: 'Distinct Actors', value: distinctActors, sub: 'unique users', tone: 'info' },
              { label: 'Entities Touched', value: distinctEntities, sub: 'system modules', tone: 'info' },
              { label: 'Latest', value: logs.length ? fmtRelative(logs[0].createdAt) : '—', sub: 'most recent event', tone: 'success' },
            ]}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by actor, entity, or details…" className="pl-9 h-9 text-[13px]" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-[13px]"><SelectValue placeholder="Action type" /></SelectTrigger>
          <SelectContent>
            {actions.map((a) => <SelectItem key={a} value={a}>{a === 'ALL' ? 'All Actions' : a.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-3"><RowSkeleton count={6} /></Card>
      ) : logs.length === 0 ? (
        <Card><EmptyState icon={ScrollText} title="No audit logs" description="System activity will appear here." /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Search} title="No matches" description="Try adjusting your search or filter." /></Card>
      ) : (
        <Card className="p-0 overflow-hidden animate-rise">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
            <SectionLabel>{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</SectionLabel>
            <span className="text-[10px] text-muted-foreground">most recent first</span>
          </div>
          <div className="max-h-[640px] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent sticky top-0 bg-card z-10">
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70 w-[200px]">Action</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70 w-[160px]">Actor</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70 w-[120px]">Entity</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Details</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70 text-right w-[140px]">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const Icon = actionIcons[l.action] || User
                  const tone = actionTone[l.action] || 'neutral'
                  const toneClass =
                    tone === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
                    tone === 'info' ? 'bg-sky-500/10 text-sky-600' :
                    tone === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                    tone === 'danger' ? 'bg-rose-500/10 text-rose-600' :
                    'bg-muted text-muted-foreground'
                  return (
                    <TableRow key={l.id} className="transition-colors hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-md grid place-items-center shrink-0 ${toneClass}`}><Icon className="h-3.5 w-3.5" /></div>
                          <span className="text-[12px] font-medium leading-tight">{l.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className="text-[12px] truncate">{l.actorName}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1"><Database className="h-2.5 w-2.5" />{l.entity}</Badge></TableCell>
                      <TableCell className="text-[12px] text-muted-foreground max-w-[300px] truncate" >{l.details}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] tabular-nums text-foreground" title={fmtDateTime(l.createdAt)}>{fmtRelative(l.createdAt)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
