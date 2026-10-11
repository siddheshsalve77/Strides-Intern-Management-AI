'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, RowSkeleton, SectionLabel } from '@/components/portal/ui-helpers'
import { Building2, Users, UserCircle2 } from 'lucide-react'
import type { EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

interface Dept { id: string; name: string; head: string; description: string }

export function DepartmentsView() {
  const [depts, setDepts] = useState<Dept[]>([])
  const [employees, setEmployees] = useState<EmployeeT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      authedFetch('/api/departments').then((r) => r.json()).catch(() => []),
      authedFetch('/api/employees').then((r) => r.json()).catch(() => []),
    ]).then(([d, e]) => { setDepts(Array.isArray(d) ? d : []); setEmployees(Array.isArray(e) ? e : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const totalCount = employees.length
  const avgPerDept = depts.length ? Math.round(totalCount / depts.length) : 0
  const headsAssigned = depts.filter((d) => d.head).length

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description={`${depts.length} organizational units`} />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={3} /> : (
          <MetricStrip
            metrics={[
              { label: 'Departments', value: depts.length, sub: 'organizational units', tone: 'info' },
              { label: 'Total Employees', value: totalCount, sub: 'across all depts', tone: 'success' },
              { label: 'Avg / Dept', value: avgPerDept, sub: 'team size', tone: 'info' },
              { label: 'Heads Assigned', value: `${headsAssigned}/${depts.length}`, sub: 'leadership coverage', tone: headsAssigned === depts.length ? 'success' : 'warning' },
            ]}
          />
        )}
      </div>

      {loading ? <Card className="p-3"><RowSkeleton count={6} /></Card> :
        depts.length === 0 ? <Card><EmptyState icon={Building2} title="No departments" /></Card> : (
          <Card className="p-0 overflow-hidden animate-rise">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
              <SectionLabel>All departments</SectionLabel>
              <span className="text-[10px] text-muted-foreground">click a department to learn more</span>
            </div>
            <div className="divide-y">
              {depts.map((d, i) => {
                const count = employees.filter((e) => e.department === d.name).length
                return (
                  <div key={d.id} className="compact-row transition-colors hover:bg-muted/40 animate-rise" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-tight truncate">{d.name}</p>
                      {d.description && <p className="text-[11px] text-muted-foreground truncate">{d.description}</p>}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                      <UserCircle2 className="h-3 w-3" />
                      <span className="truncate max-w-[140px]">{d.head || 'Unassigned'}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] gap-1 h-5 px-1.5 shrink-0 tabular-nums">
                      <Users className="h-3 w-3" /> {count}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      }
    </div>
  )
}
