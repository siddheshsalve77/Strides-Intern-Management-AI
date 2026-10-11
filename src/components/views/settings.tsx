'use client'

import { useState } from 'react'
import { useApp, roleLabel } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, SectionCard, SectionLabel } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'
import { useTheme } from 'next-themes'
import {
  Bell, Moon, Sun, Monitor, User, Shield, Mail, MessageSquare,
  CalendarDays, ListChecks, Wallet, LifeBuoy, Save, Loader2, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

interface NotificationPrefs {
  email: boolean
  inApp: boolean
  taskAssigned: boolean
  leaveUpdates: boolean
  meetingReminders: boolean
  announcements: boolean
  expenseUpdates: boolean
  weeklyDigest: boolean
}

export function SettingsView() {
  const { currentEmployee } = useApp()
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email: true, inApp: true, taskAssigned: true, leaveUpdates: true,
    meetingReminders: true, announcements: true, expenseUpdates: true, weeklyDigest: false,
  })
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(currentEmployee?.name || '')

  function updatePref(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  function save() {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('Settings saved successfully')
    }, 600)
  }

  if (!currentEmployee) return null
  const emp = currentEmployee

  const notificationSettings = [
    { key: 'taskAssigned' as const, label: 'Task Assignments', desc: 'When a new task is assigned to you', icon: ListChecks, accent: 'bg-sky-500/10 text-sky-600' },
    { key: 'leaveUpdates' as const, label: 'Leave Updates', desc: 'Leave request status changes', icon: CalendarDays, accent: 'bg-amber-500/10 text-amber-600' },
    { key: 'meetingReminders' as const, label: 'Meeting Reminders', desc: '15 min before scheduled meetings', icon: Bell, accent: 'bg-emerald-500/10 text-emerald-600' },
    { key: 'announcements' as const, label: 'Announcements', desc: 'Company announcements and policies', icon: Mail, accent: 'bg-teal-500/10 text-teal-600' },
    { key: 'expenseUpdates' as const, label: 'Expense Updates', desc: 'Expense claim status changes', icon: Wallet, accent: 'bg-violet-500/10 text-violet-600' },
    { key: 'weeklyDigest' as const, label: 'Weekly Digest', desc: 'AI-generated weekly summary every Monday', icon: MessageSquare, accent: 'bg-rose-500/10 text-rose-600' },
  ]

  const securityItems = [
    { icon: Shield, label: 'Change Password', hint: 'Recommended', tone: 'bg-primary/10 text-primary' },
    { icon: Shield, label: 'Two-Factor Authentication', hint: 'Not enabled', tone: 'bg-amber-500/15 text-amber-600', badgeTone: 'amber' },
    { icon: LifeBuoy, label: 'Active Sessions', hint: '1 device', tone: 'bg-muted text-muted-foreground' },
  ]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Settings" description="Manage your preferences and account settings" />

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs"><Sun className="h-3.5 w-3.5" /> Preferences</TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Account</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Delivery channels */}
          <SectionCard className="shadow-card">
            <SectionLabel>Delivery Channels</SectionLabel>
            <p className="text-[11px] text-muted-foreground mt-1 mb-3">Choose how you want to receive notifications</p>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><Mail className="h-4 w-4" /></div>
                  <div><p className="text-[13px] font-medium">Email</p><p className="text-[11px] text-muted-foreground">{emp.email}</p></div>
                </div>
                <Switch checked={prefs.email} onCheckedChange={(v) => updatePref('email', v)} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center"><Bell className="h-4 w-4" /></div>
                  <div><p className="text-[13px] font-medium">In-app notifications</p><p className="text-[11px] text-muted-foreground">Show in the notification center</p></div>
                </div>
                <Switch checked={prefs.inApp} onCheckedChange={(v) => updatePref('inApp', v)} />
              </div>
            </div>
          </SectionCard>

          {/* Notification types */}
          <SectionCard className="shadow-card">
            <SectionLabel>Notification Types</SectionLabel>
            <p className="text-[11px] text-muted-foreground mt-1 mb-3">Select which events trigger notifications</p>
            <div className="divide-y divide-border">
              {notificationSettings.map((s) => {
                const Icon = s.icon
                return (
                  <div key={s.key} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('h-8 w-8 rounded-lg grid place-items-center shrink-0', s.accent)}><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0"><p className="text-[13px] font-medium truncate">{s.label}</p><p className="text-[11px] text-muted-foreground truncate">{s.desc}</p></div>
                    </div>
                    <Switch checked={prefs[s.key]} onCheckedChange={(v) => updatePref(s.key, v)} />
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Preferences
            </Button>
          </div>
        </TabsContent>

        {/* Appearance / Preferences Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <SectionCard className="shadow-card">
            <SectionLabel>Theme</SectionLabel>
            <p className="text-[11px] text-muted-foreground mt-1 mb-4">Choose your preferred color scheme</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ].map((t) => {
                const Icon = t.icon
                const active = theme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); toast.success(`Switched to ${t.label} theme`) }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all duration-200',
                      active ? 'border-primary bg-primary/5 shadow-card' : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className={cn('h-10 w-10 rounded-lg grid place-items-center', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn('text-[13px] font-medium', active && 'text-primary')}>{t.label}</span>
                    {active && <CheckCircle2 className="h-3 w-3 text-primary" />}
                  </button>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard className="shadow-card">
            <SectionLabel>Density</SectionLabel>
            <p className="text-[11px] text-muted-foreground mt-1 mb-4">Adjust the spacing and compactness of the interface</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 rounded-lg border-2 border-primary bg-primary/5 p-4 shadow-card">
                <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Monitor className="h-5 w-5" /></div>
                <span className="text-[13px] font-medium text-primary">Comfortable</span>
              </button>
              <button className="flex flex-col items-center gap-2 rounded-lg border-2 border-border hover:border-primary/40 p-4 transition-all duration-200">
                <div className="h-10 w-10 rounded-lg bg-muted text-muted-foreground grid place-items-center"><Monitor className="h-5 w-5" /></div>
                <span className="text-[13px] font-medium">Compact</span>
              </button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <SectionCard className="shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-14 w-14"><AvatarImage src={emp.photoUrl} /><AvatarFallback className="bg-primary/15 text-primary text-base font-bold">{initials(emp.name)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-[15px] truncate">{emp.name}</p>
                <p className="text-[12px] text-muted-foreground truncate">{emp.designation}</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">{roleLabel[emp.role]}</Badge>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email (read-only)</Label>
                <Input value={emp.email} disabled className="bg-muted/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Employee ID</Label>
                  <Input value={emp.employeeId} disabled className="bg-muted/50 font-mono tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Input value={roleLabel[emp.role]} disabled className="bg-muted/50" />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
              </Button>
            </div>
          </SectionCard>

          <SectionCard className="shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <SectionLabel>Security</SectionLabel>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">Manage your account security</p>
            <div className="divide-y divide-border">
              {securityItems.map((item, i) => {
                const Icon = item.icon
                return (
                  <button key={i} className="w-full flex items-center justify-between py-3 hover:bg-accent -mx-2 px-2 rounded transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-8 w-8 rounded-lg grid place-items-center', item.tone)}><Icon className="h-4 w-4" /></div>
                      <span className="text-[13px] font-medium">{item.label}</span>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] border-0', item.badgeTone === 'amber' && 'bg-amber-500/15 text-amber-600')}>{item.hint}</Badge>
                  </button>
                )
              })}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
