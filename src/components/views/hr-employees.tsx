'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, RowSkeleton } from '@/components/portal/ui-helpers'
import { initials } from '@/lib/format'
import { roleLabel } from '@/lib/store'
import { hasPermission, canLogin, ACCOUNT_STATUSES } from '@/lib/permissions'
import type { Role } from '@/lib/types'
import {
  UserPlus, Users, Shield, Loader2, MoreVertical, KeyRound, Ban, UserX, CheckCircle2, Archive, Edit2, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { authedFetch } from '@/lib/firebase-auth'

interface HREmployee {
  id: string
  employeeId: string
  email: string
  name: string
  role: Role
  designation: string
  department: string
  team: string
  managerId?: string | null
  manager?: { id: string; name: string } | null
  employmentType: string
  workLocation: string
  joinDate: string
  internshipStart?: string | null
  internshipEnd?: string | null
  status: string
  phone: string
  photoUrl: string
}

export function HREmployeesView() {
  const { currentEmployee } = useApp()
  const [employees, setEmployees] = useState<HREmployee[]>([])
  const [managers, setManagers] = useState<HREmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  // Permission check
  const canManage = currentEmployee && hasPermission(currentEmployee.role, 'manage_employees')
  const canCreate = currentEmployee && hasPermission(currentEmployee.role, 'create_account')

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    const res = await authedFetch('/api/hr/employees', {
      headers: { 'x-actor-id': currentEmployee.id },
    })
    if (res.ok) {
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      setEmployees(arr)
      setManagers(arr.filter((e: HREmployee) => ['MANAGER', 'HR'].includes(e.role) && e.status === 'ACTIVE'))
    } else {
      setEmployees([]); setManagers([])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [currentEmployee]) // eslint-disable-line react-hooks/set-state-in-effect

  async function updateStatus(id: string, status: string) {
    if (!currentEmployee) return
    setActionMenu(null)
    const res = await authedFetch(`/api/hr/employees/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-actor-id': currentEmployee.id },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const statusLabels: Record<string, string> = { ACTIVE: 'activated', SUSPENDED: 'suspended', INACTIVE: 'deactivated', ARCHIVED: 'archived' }
      toast.success(`Employee ${statusLabels[status] || status}`)
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to update')
    }
  }

  const filtered = employees.filter((e) =>
    (filter === 'ALL' || e.status === filter) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase()))
  )

  const active = employees.filter((e) => e.status === 'ACTIVE').length
  const suspended = employees.filter((e) => e.status === 'SUSPENDED').length
  const inactive = employees.filter((e) => e.status === 'INACTIVE').length
  const interns = employees.filter((e) => e.role === 'INTERN').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        description="Create and manage employee accounts, roles, and lifecycle"
        actions={canCreate && (
          <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} managers={managers} onCreated={load} actorId={currentEmployee?.id || ''} />
        )}
      />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Total', value: employees.length, sub: 'all accounts', tone: 'info' },
              { label: 'Active', value: active, sub: 'in good standing', tone: 'success' },
              { label: 'Suspended', value: suspended, sub: 'access restricted', tone: suspended > 0 ? 'warning' : 'default' },
              { label: 'Interns', value: interns, sub: 'current batch', tone: 'info' },
            ]}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or ID…" className="flex-1 h-9 text-[13px]" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-3"><RowSkeleton count={6} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No employees found" description="Try adjusting your search or filter." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Employee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Role</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Department</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Manager</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground/70 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const tone =
                  e.status === 'ACTIVE' ? 'success' :
                  e.status === 'SUSPENDED' ? 'warning' :
                  e.status === 'INACTIVE' ? 'danger' : 'neutral'
                return (
                  <TableRow key={e.id} className={`transition-colors hover:bg-muted/40 ${e.status === 'ARCHIVED' ? 'opacity-50' : ''}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <Avatar className="h-8 w-8"><AvatarImage src={e.photoUrl} /><AvatarFallback className="text-[10px] bg-muted text-foreground">{initials(e.name)}</AvatarFallback></Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 status-dot status-dot-${tone}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium leading-tight truncate">{e.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">{e.employeeId} · {e.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] h-5 px-1.5">{roleLabel[e.role]}</Badge></TableCell>
                    <TableCell className="text-[12px]">{e.department}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{e.manager?.name || '—'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`status-dot status-dot-${tone}`} />
                        <span className="text-[11px] text-muted-foreground">{e.status}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right relative">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActionMenu(actionMenu === e.id ? null : e.id)}>
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                      {actionMenu === e.id && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-48 surface-raised border border-border rounded-lg shadow-pop py-1 animate-fade-in-up">
                          {e.status === 'ACTIVE' ? (
                            <>
                              <button onClick={() => updateStatus(e.id, 'SUSPENDED')} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent text-amber-600 transition-colors">
                                <Ban className="h-3 w-3" /> Suspend
                              </button>
                              <button onClick={() => updateStatus(e.id, 'INACTIVE')} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent text-rose-600 transition-colors">
                                <UserX className="h-3 w-3" /> Deactivate
                              </button>
                            </>
                          ) : (
                            <button onClick={() => updateStatus(e.id, 'ACTIVE')} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent text-emerald-600 transition-colors">
                              <CheckCircle2 className="h-3 w-3" /> Activate
                            </button>
                          )}
                          <button onClick={() => { updateStatus(e.id, 'ARCHIVED'); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent text-zinc-600 transition-colors">
                            <Archive className="h-3 w-3" /> Archive
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

function CreateEmployeeDialog({ open, onOpenChange, managers, onCreated, actorId }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  managers: HREmployee[]
  onCreated: () => void
  actorId: string
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [managerId, setManagerId] = useState('')
  const [employmentType, setEmploymentType] = useState('Full-time')
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0])
  const [internshipStart, setInternshipStart] = useState('')
  const [internshipEnd, setInternshipEnd] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function create() {
    if (!name || !email) { toast.error('Name and email required'); return }
    setSubmitting(true)
    try {
      const res = await authedFetch('/api/hr/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-actor-id': actorId },
        body: JSON.stringify({
          name, email, role, designation, department, managerId: managerId || undefined,
          employmentType, joinDate,
          internshipStart: role === 'INTERN' && internshipStart ? internshipStart : undefined,
          internshipEnd: role === 'INTERN' && internshipEnd ? internshipEnd : undefined,
          phone,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      toast.success(`Account created! Employee ID: ${data.employeeId}`, {
        description: `Default password: password123. The employee can log in immediately.`,
      })
      onOpenChange(false)
      setName(''); setEmail(''); setDesignation(''); setPhone(''); setInternshipStart(''); setInternshipEnd('')
      onCreated()
    } catch (e: any) { toast.error(e.message || 'Failed to create account') }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="h-4 w-4" /> Create Account</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Employee Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Only HR can create employee accounts. The new employee will receive a default password (password123) and should change it on first login. Role cannot be self-changed later.</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Full Name <span className="text-rose-500">*</span></Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" /></div>
            <div className="space-y-1.5"><Label>Email <span className="text-rose-500">*</span></Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@strides.com" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Role <span className="text-rose-500">*</span></Label>
              <Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="INTERN">Intern</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Employment Type</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Intern">Intern</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
              </SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Designation</Label><Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Software Engineer" /></div>
            <div className="space-y-1.5"><Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {['Engineering', 'Human Resources', 'IT Support', 'Finance', 'Product'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Manager</Label>
            <Select value={managerId} onValueChange={setManagerId}><SelectTrigger><SelectValue placeholder="Select manager (optional)" /></SelectTrigger><SelectContent>
              {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.designation}</SelectItem>)}
            </SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Join Date</Label><Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} /></div>
          {role === 'INTERN' && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
              <div className="space-y-1.5"><Label className="text-violet-700">Internship Start</Label><Input type="date" value={internshipStart} onChange={(e) => setInternshipStart(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-violet-700">Internship End</Label><Input type="date" value={internshipEnd} onChange={(e) => setInternshipEnd(e.target.value)} /></div>
            </div>
          )}
          <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
