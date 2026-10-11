'use client'

import { useState, useEffect } from 'react'
import { useApp, roleLabel } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileEditModal } from '@/components/portal/profile-edit-modal'
import { PageHeader, SectionLabel } from '@/components/portal/ui-helpers'
import { fmtDate, initials, toStringArray } from '@/lib/format'
import { User, Mail, Phone, MapPin, Building2, Calendar, Briefcase, Target, Edit2, Sparkles, IdCard, Award } from 'lucide-react'
import { toast } from 'sonner'
import type { EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

export function ProfileView() {
  const { currentEmployee, setEmployee } = useApp()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    phone: '', skills: '', emergencyContact: '', emergencyPhone: '', careerGoals: '', photoUrl: '',
  })

  useEffect(() => {
    if (currentEmployee) {
      setForm({
        phone: currentEmployee.phone || '',
        skills: currentEmployee.skills || '',
        emergencyContact: currentEmployee.emergencyContact || '',
        emergencyPhone: currentEmployee.emergencyPhone || '',
        careerGoals: currentEmployee.careerGoals || '',
        photoUrl: currentEmployee.photoUrl || '',
      })
    }
  }, [currentEmployee])

  if (!currentEmployee) return null
  const emp = currentEmployee
  const skills = toStringArray(emp.skills)

  async function save() {
    if (!currentEmployee) return
    setSaving(true)
    try {
      const res = await authedFetch(`/api/employees/${currentEmployee.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json() as EmployeeT
      setEmployee(updated)
      setEditing(false)
      toast.success('Profile updated successfully')
    } catch { toast.error('Failed to update profile') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <ProfileEditModal open={editing} onOpenChange={setEditing} />
      <PageHeader
        title="My Profile"
        description="Your employee information"
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4" /> Edit Profile</Button>
        }
      />

      {/* Identity hero */}
      <Card className="relative overflow-hidden animate-rise">
        <div className="h-24 bg-gradient-to-r from-primary to-emerald-700 relative">
          <div className="absolute inset-0 bg-grid opacity-10" />
        </div>
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-10">
            <Avatar className="h-20 w-20 border-4 border-background shrink-0 shadow-card"><AvatarImage src={emp.photoUrl} /><AvatarFallback className="text-2xl bg-primary/15 text-primary font-bold">{initials(emp.name)}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">{emp.name}</h2>
                <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />{roleLabel[emp.role]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{emp.designation}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5 text-sm">
            <HeroFact icon={Building2} label="Department" value={emp.department} />
            <HeroFact icon={Briefcase} label="Employment" value={emp.employmentType} />
            <HeroFact icon={MapPin} label="Location" value={emp.workLocation} />
            <HeroFact icon={Calendar} label="Joined" value={fmtDate(emp.joinDate, 'MMM yyyy')} />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card className="p-0 overflow-hidden animate-rise">
            <div className="px-4 py-2.5 border-b bg-muted/30"><SectionLabel>Personal information</SectionLabel></div>
            <div className="divide-y">
              <Row label="Full Name" value={emp.name} icon={User} />
              <Row label="Employee ID" value={emp.employeeId} icon={IdCard} mono />
              <Row label="Email" value={emp.email} icon={Mail} />
              <EditableRow label="Phone" value={form.phone} icon={Phone} editing={editing} onChange={(v) => setForm({ ...form, phone: v })} />
              <Row label="Work Location" value={emp.workLocation} icon={MapPin} />
              <Row label="Team" value={emp.team} icon={Briefcase} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <div className="space-y-4">
            <Card className="p-4 animate-rise">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center"><Award className="h-3.5 w-3.5" /></div>
                  <SectionLabel>Skills</SectionLabel>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{skills.length} listed</span>
              </div>
              {editing ? (
                <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Comma-separated skills" className="h-9 text-[13px]" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skills.length ? skills.map((s) => <Badge key={s} variant="secondary" className="text-[11px] h-5 px-1.5">{s}</Badge>) : <p className="text-[12px] text-muted-foreground">No skills listed</p>}
                </div>
              )}
            </Card>
            <Card className="p-4 animate-rise">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center"><Target className="h-3.5 w-3.5" /></div>
                <SectionLabel>Career Goals</SectionLabel>
              </div>
              {editing ? (
                <Textarea value={form.careerGoals} onChange={(e) => setForm({ ...form, careerGoals: e.target.value })} rows={3} placeholder="Your career aspirations…" className="text-[12px]" />
              ) : (
                <p className="text-[12px] text-muted-foreground leading-relaxed">{emp.careerGoals || 'Not set'}</p>
              )}
            </Card>
            <Card className="p-0 overflow-hidden animate-rise">
              <div className="px-4 py-2.5 border-b bg-muted/30"><SectionLabel>Employment</SectionLabel></div>
              <div className="divide-y">
                <Row label="Department" value={emp.department} icon={Building2} />
                <Row label="Designation" value={emp.designation} icon={Briefcase} />
                <Row label="Employment Type" value={emp.employmentType} icon={Briefcase} />
                <Row label="Join Date" value={fmtDate(emp.joinDate, 'd MMM yyyy')} icon={Calendar} />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emergency">
          <Card className="p-0 overflow-hidden animate-rise">
            <div className="px-4 py-2.5 border-b bg-muted/30"><SectionLabel>Emergency contacts</SectionLabel></div>
            <div className="divide-y">
              <EditableRow label="Emergency Contact" value={form.emergencyContact} icon={User} editing={editing} onChange={(v) => setForm({ ...form, emergencyContact: v })} />
              <EditableRow label="Emergency Phone" value={form.emergencyPhone} icon={Phone} editing={editing} onChange={(v) => setForm({ ...form, emergencyPhone: v })} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function HeroFact({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
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

function Row({ label, value, icon: Icon, mono }: { label: string; value: string; icon: any; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
        {label}
      </div>
      <p className={`text-[12px] font-medium truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function EditableRow({ label, value, icon: Icon, editing, onChange }: { label: string; value: string; icon: any; editing: boolean; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground shrink-0"><Icon className="h-3.5 w-3.5 text-muted-foreground/70" />{label}</div>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[240px] h-8 text-[12px]" />
      ) : (
        <p className="text-[12px] font-medium truncate">{value || '—'}</p>
      )}
    </div>
  )
}
