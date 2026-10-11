'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, RowSkeleton, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtDate, initials } from '@/lib/format'
import { Users, Search, Calendar, Building2 } from 'lucide-react'
import type { EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

export function EmployeesView() {
  const [employees, setEmployees] = useState<EmployeeT[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('ALL')
  const [role, setRole] = useState('ALL')

  useEffect(() => { authedFetch('/api/employees').then((r) => r.json()).then((e) => { setEmployees(Array.isArray(e) ? e : []); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const departments = ['ALL', ...Array.from(new Set(employees.map((e) => e.department)))]
  const roles = ['ALL', 'EMPLOYEE', 'INTERN', 'MANAGER', 'HR', 'ADMIN']
  const filtered = employees.filter((e) =>
    (dept === 'ALL' || e.department === dept) &&
    (role === 'ALL' || e.role === role) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase()))
  )

  const active = employees.filter((e) => e.status === 'ACTIVE').length
  const interns = employees.filter((e) => e.role === 'INTERN').length
  const managers = employees.filter((e) => e.role === 'MANAGER').length

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description={`${employees.length} total employees · ${departments.length - 1} departments`} />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Total', value: employees.length, sub: 'all records', tone: 'info' },
              { label: 'Active', value: active, sub: 'currently employed', tone: 'success' },
              { label: 'Interns', value: interns, sub: 'in program', tone: 'info' },
              { label: 'Managers', value: managers, sub: 'team leads', tone: 'info' },
            ]}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or employee ID…" className="pl-9 h-9 text-[13px]" />
        </div>
        <Select value={dept} onValueChange={setDept}><SelectTrigger className="w-full sm:w-44 h-9 text-[13px]"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d === 'ALL' ? 'All Depts' : d}</SelectItem>)}</SelectContent></Select>
        <Select value={role} onValueChange={setRole}><SelectTrigger className="w-full sm:w-36 h-9 text-[13px]"><SelectValue placeholder="Role" /></SelectTrigger><SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r === 'ALL' ? 'All Roles' : r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select>
      </div>

      {loading ? (
        <Card className="p-3"><RowSkeleton count={6} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Users} title="No employees" description="Try adjusting your search or filters." /></Card>
      ) : (
        <Card className="p-0 overflow-hidden animate-rise">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
            <SectionLabel>{filtered.length} {filtered.length === 1 ? 'employee' : 'employees'}</SectionLabel>
            <span className="text-[10px] text-muted-foreground tabular-nums">sorted by name</span>
          </div>
          <div className="divide-y">
            {filtered.map((e) => {
              const tone =
                e.status === 'ACTIVE' ? 'success' :
                e.status === 'INACTIVE' ? 'danger' : 'neutral'
              return (
                <div key={e.id} className="compact-row transition-colors hover:bg-muted/40">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9"><AvatarImage src={e.photoUrl} /><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials(e.name)}</AvatarFallback></Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 status-dot status-dot-${tone}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight truncate">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{e.designation}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 shrink-0 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Building2 className="h-3 w-3" />{e.department}</span>
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /><span className="tabular-nums">{fmtDate(e.joinDate, 'MMM yyyy')}</span></span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{e.role}</Badge>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono tabular-nums">{e.employeeId}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
