'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, MetricStrip, EmptyState, RowSkeleton } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { fmtTime, fmtDate, initials, toStringArray } from '@/lib/format'
import { Video, Plus, Clock, Calendar, MapPin, Loader2, CheckCircle2, Video as VideoIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { MeetingT, EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const typeColors: Record<string, string> = {
  STANDUP: 'bg-emerald-500/15 text-emerald-600',
  REVIEW: 'bg-sky-500/15 text-sky-600',
  TRAINING: 'bg-rose-500/15 text-rose-600',
  MEETING: 'bg-primary/15 text-primary',
  INTERVIEW: 'bg-violet-500/15 text-violet-600',
  OTHER: 'bg-zinc-400/15 text-zinc-500',
}

const typeBars: Record<string, string> = {
  STANDUP: 'bg-emerald-500',
  REVIEW: 'bg-sky-500',
  TRAINING: 'bg-rose-500',
  MEETING: 'bg-primary',
  INTERVIEW: 'bg-violet-500',
  OTHER: 'bg-amber-500',
}

export function MeetingsView() {
  const { currentEmployee } = useApp()
  const [meetings, setMeetings] = useState<MeetingT[]>([])
  const [employees, setEmployees] = useState<EmployeeT[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [location, setLocation] = useState('Zoom')
  const [type, setType] = useState('MEETING')
  const [attendees, setAttendees] = useState<string[]>([])

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    try {
      const [m, e] = await Promise.all([
        authedFetch(`/api/meetings?employeeId=${currentEmployee.id}`).then((r) => r.json()).catch(() => []),
        authedFetch('/api/employees').then((r) => r.json()).catch(() => []),
      ])
      setMeetings(Array.isArray(m) ? m : []); setEmployees(Array.isArray(e) ? e : [])
    } catch {
      setMeetings([]); setEmployees([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function create() {
    if (!currentEmployee || !title || !date) { toast.error('Title and date required'); return }
    // Check for conflicts: any attendee (including organizer) who has an overlapping meeting
    const newStart = new Date(`${date}T${startTime}:00`)
    const newEnd = new Date(`${date}T${endTime}:00`)
    const allParticipantIds = [currentEmployee.id, ...attendees]
    const conflicts: { name: string; title: string; time: string }[] = []
    meetings.forEach((m) => {
      const mStart = new Date(m.startTime)
      const mEnd = new Date(m.endTime)
      // overlap check
      if (newStart < mEnd && newEnd > mStart) {
        if (m.organizerId && allParticipantIds.includes(m.organizerId)) {
          const emp = employees.find((e) => e.id === m.organizerId)
          conflicts.push({ name: emp?.name || 'Organizer', title: m.title, time: `${fmtTime(m.startTime)}–${fmtTime(m.endTime)}` })
        }
        const mAttendees = toStringArray(m.attendeeIds)
        mAttendees.forEach((aid) => {
          if (allParticipantIds.includes(aid)) {
            const emp = employees.find((e) => e.id === aid)
            if (emp && !conflicts.find((c) => c.name === emp.name)) {
              conflicts.push({ name: emp.name, title: m.title, time: `${fmtTime(m.startTime)}–${fmtTime(m.endTime)}` })
            }
          }
        })
      }
    })
    if (conflicts.length > 0) {
      const proceed = confirm(`⚠️ Scheduling conflict detected!\n\n${conflicts.slice(0, 3).map((c) => `• ${c.name} has "${c.title}" at ${c.time}`).join('\n')}${conflicts.length > 3 ? `\n…and ${conflicts.length - 3} more` : ''}\n\nSchedule anyway?`)
      if (!proceed) return
    }
    setSubmitting(true)
    try {
      await authedFetch('/api/meetings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, organizerId: currentEmployee.id,
          attendeeIds: attendees, startTime: `${date}T${startTime}:00`, endTime: `${date}T${endTime}:00`,
          location, type,
        }),
      })
      toast.success('Meeting scheduled'); setOpen(false); setTitle(''); setDescription(''); setAttendees([]); load()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  async function updateStatus(id: string, status: string) {
    await authedFetch('/api/meetings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    toast.success('Meeting updated'); load()
  }

  const today = new Date().toDateString()
  const todayMeetings = meetings.filter((m) => new Date(m.startTime).toDateString() === today)
  const upcoming = meetings.filter((m) => new Date(m.startTime).toDateString() !== today && new Date(m.startTime) > new Date())

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings & Schedule"
        description="Your meetings and calendar"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Schedule</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
              <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title…" /></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Type</Label>
                    <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {['MEETING', 'STANDUP', 'REVIEW', 'TRAINING', 'INTERVIEW', 'OTHER'].map((t) => <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Start Time</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>End Time</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room or link…" /></div>
                <div className="space-y-1.5">
                  <Label>Attendees</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 scrollbar-thin surface-sunken">
                    {employees.filter((e) => e.id !== currentEmployee?.id).map((e) => (
                      <label key={e.id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-accent rounded cursor-pointer">
                        <input type="checkbox" checked={attendees.includes(e.id)} onChange={(ev) => setAttendees((a) => ev.target.checked ? [...a, e.id] : a.filter((x) => x !== e.id))} className="rounded" />
                        <Avatar className="h-5 w-5"><AvatarImage src={e.photoUrl} /><AvatarFallback className="text-[8px]">{initials(e.name)}</AvatarFallback></Avatar>
                        <span className="text-xs">{e.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule'}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <MetricStrip
        metrics={[
          { label: 'Today', value: todayMeetings.length, sub: 'scheduled', tone: 'info' },
          { label: 'Upcoming', value: upcoming.length, sub: 'this week' },
          { label: 'Stand-ups', value: meetings.filter((m) => m.type === 'STANDUP').length, sub: 'recurring' },
          { label: 'Reviews', value: meetings.filter((m) => m.type === 'REVIEW').length, sub: 'sessions' },
        ]}
      />

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today" className="text-xs gap-1.5"><Calendar className="h-3.5 w-3.5" /> Today ({todayMeetings.length})</TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" /> Upcoming ({upcoming.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {loading ? (
            <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={4} /></div>
          ) : todayMeetings.length === 0 ? (
            <Card className="shadow-card"><EmptyState icon={Video} title="No meetings today" description="Enjoy your free day!" /></Card>
          ) : (
            <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
              <div className="divide-y divide-border">
                {todayMeetings.map((m, i) => <MeetingRow key={m.id} meeting={m} employees={employees} onUpdate={updateStatus} index={i} />)}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <Card className="shadow-card"><EmptyState icon={Calendar} title="No upcoming meetings" /></Card>
          ) : (
            <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
              <div className="divide-y divide-border">
                {upcoming.map((m, i) => <MeetingRow key={m.id} meeting={m} employees={employees} onUpdate={updateStatus} index={i} />)}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MeetingRow({ meeting, employees, onUpdate, index }: { meeting: MeetingT; employees: EmployeeT[]; onUpdate: (id: string, status: string) => void; index: number }) {
  const attendeeList = toStringArray(meeting.attendeeIds)
  const attendeeEmps = attendeeList.map((id) => employees.find((e) => e.id === id)).filter(Boolean) as EmployeeT[]
  const isPast = new Date(meeting.endTime) < new Date()
  const isOnline = meeting.location.toLowerCase().includes('zoom') || meeting.location.toLowerCase().includes('online')

  return (
    <div className="flex items-stretch gap-0 animate-rise" style={{ animationDelay: `${index * 0.04}s` }}>
      {/* Type color stripe */}
      <div className={cn('w-1 shrink-0', typeBars[meeting.type] || 'bg-zinc-400')} />
      {/* Time chip */}
      <div className="flex flex-col items-center justify-center shrink-0 w-20 px-3 py-3 border-r border-border surface-sunken">
        <p className="text-[13px] font-bold leading-none tabular-nums">{fmtTime(meeting.startTime)}</p>
        <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{fmtTime(meeting.endTime)}</p>
      </div>
      {/* Content */}
      <div className="min-w-0 flex-1 p-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn('font-semibold text-[13px] leading-tight', isPast && 'text-muted-foreground line-through')}>{meeting.title}</p>
          <Badge variant="outline" className={cn('text-[10px] border-0', typeColors[meeting.type])}>{meeting.type}</Badge>
          {meeting.status !== 'SCHEDULED' && <Badge variant="outline" className="text-[10px] border-0">{meeting.status.toLowerCase()}</Badge>}
        </div>
        {meeting.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{meeting.description}</p>}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {meeting.location}</span>
          <span className="flex items-center gap-1 tabular-nums"><Calendar className="h-3 w-3" /> {fmtDate(meeting.startTime, 'd MMM')}</span>
          {attendeeEmps.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {attendeeEmps.slice(0, 4).map((e) => (
                  <Avatar key={e.id} className="h-4 w-4 border border-background"><AvatarImage src={e.photoUrl} /><AvatarFallback className="text-[7px]">{initials(e.name)}</AvatarFallback></Avatar>
                ))}
              </div>
              <span className="tabular-nums">{attendeeEmps.length}</span>
            </div>
          )}
        </div>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 pr-3.5">
        {isOnline && (
          <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1"><VideoIcon className="h-3 w-3" /> Join</Button>
        )}
        {!isPast && meeting.status === 'SCHEDULED' && (
          <Button size="sm" variant="ghost" className="text-[11px] h-7 text-emerald-600 gap-1" onClick={() => onUpdate(meeting.id, 'COMPLETED')}><CheckCircle2 className="h-3 w-3" /> Done</Button>
        )}
      </div>
    </div>
  )
}
