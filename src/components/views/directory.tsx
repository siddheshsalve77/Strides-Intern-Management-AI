'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, RowSkeleton, SectionLabel } from '@/components/portal/ui-helpers'
import { initials, fmtDate, toStringArray } from '@/lib/format'
import { roleLabel } from '@/lib/store'
import { Search, Users, Building2, MapPin, Phone, Mail, Briefcase, Calendar, X, Target, Sparkles, Hash } from 'lucide-react'
import type { EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

export function DirectoryView() {
  const { currentEmployee } = useApp()
  const [employees, setEmployees] = useState<EmployeeT[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('ALL')
  const [selected, setSelected] = useState<EmployeeT | null>(null)

  useEffect(() => {
    authedFetch('/api/directory').then((r) => r.json()).then((e) => { setEmployees(Array.isArray(e) ? e : []); setLoading(false) }).catch(() => setLoading(false))
  }, [currentEmployee])

  const departments = ['ALL', ...Array.from(new Set(employees.map((e) => e.department)))]
  const filtered = employees.filter((e) =>
    (dept === 'ALL' || e.department === dept) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.designation.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase()))
  )

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length
  const managers = employees.filter((e) => e.role === 'MANAGER').length
  const interns = employees.filter((e) => e.role === 'INTERN').length

  return (
    <div className="space-y-6">
      <PageHeader title="Company Directory" description={`${employees.length} employees across ${departments.length - 1} departments`} />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Total', value: employees.length, sub: 'in directory', tone: 'info' },
              { label: 'Active', value: activeCount, sub: 'currently employed', tone: 'success' },
              { label: 'Managers', value: managers, sub: 'team leads', tone: 'info' },
              { label: 'Interns', value: interns, sub: 'in program', tone: 'info' },
            ]}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, designation or ID…" className="pl-9 h-9 text-[13px]" />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-[13px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? <Card className="p-3"><RowSkeleton count={6} /></Card> :
        filtered.length === 0 ? <Card><EmptyState icon={Users} title="No employees found" description="Try adjusting your search." /></Card> : (
          <Card className="p-0 overflow-hidden animate-rise">
            <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
              <SectionLabel>{filtered.length} {filtered.length === 1 ? 'employee' : 'employees'}</SectionLabel>
              <span className="text-[10px] text-muted-foreground">click to view details</span>
            </div>
            <div className="max-h-[640px] overflow-y-auto scrollbar-thin divide-y">
              {filtered.map((e) => {
                const tone =
                  e.status === 'ACTIVE' ? 'success' :
                  e.status === 'INACTIVE' ? 'danger' : 'neutral'
                return (
                  <div key={e.id} className="compact-row cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setSelected(e)}>
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9"><AvatarImage src={e.photoUrl} /><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials(e.name)}</AvatarFallback></Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 status-dot status-dot-${tone}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-tight truncate">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{e.designation}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{e.department}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">{e.role}</Badge>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono tabular-nums shrink-0 hidden md:inline-flex">{e.employeeId}</Badge>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      }

      {/* Profile detail modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          {selected && (
            <>
              <DialogHeader className="sr-only"><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
              <button onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-full p-1 hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>

              {/* Profile hero */}
              <div className="relative -mx-6 -mt-6 h-24 bg-gradient-to-r from-primary to-emerald-700">
                <div className="absolute inset-0 bg-grid opacity-10" />
              </div>
              <div className="flex items-end gap-4 -mt-12 mb-4">
                <Avatar className="h-20 w-20 border-4 border-background shrink-0 shadow-card"><AvatarImage src={selected.photoUrl} /><AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">{initials(selected.name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold tracking-tight truncate">{selected.name}</h2>
                    <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />{roleLabel[selected.role]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selected.designation}</p>
                </div>
              </div>

              {/* Quick info grid */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <InfoRow icon={Building2} label="Department" value={selected.department} />
                <InfoRow icon={Briefcase} label="Team" value={selected.team} />
                <InfoRow icon={MapPin} label="Location" value={selected.workLocation} />
                <InfoRow icon={Calendar} label="Joined" value={fmtDate(selected.joinDate, 'MMM yyyy')} />
              </div>

              {/* Contact */}
              <div className="space-y-1.5 mb-4">
                <SectionLabel>Contact</SectionLabel>
                <div className="flex items-center gap-2 text-[12px]"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{selected.email}</span></div>
                <div className="flex items-center gap-2 text-[12px]"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span>{selected.phone || '—'}</span></div>
              </div>

              {/* Skills */}
              {selected.skills && selected.skills !== 'General' && (
                <div className="mb-4">
                  <SectionLabel className="mb-2">Skills</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {toStringArray(selected.skills).map((s) => <Badge key={s} variant="secondary" className="text-[11px] h-5 px-1.5">{s}</Badge>)}
                  </div>
                </div>
              )}

              {/* Career goals */}
              {selected.careerGoals && (
                <div className="mb-4">
                  <SectionLabel className="mb-1.5 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Career Goals</SectionLabel>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{selected.careerGoals}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Hash className="h-3.5 w-3.5" /> <span className="font-mono tabular-nums">{selected.employeeId}</span></div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{selected.employmentType}</Badge>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-7 w-7 rounded-md bg-muted grid place-items-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-[12px] font-medium truncate leading-tight">{value || '—'}</p>
      </div>
    </div>
  )
}
