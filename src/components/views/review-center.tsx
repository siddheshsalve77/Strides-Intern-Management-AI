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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, EmptyState, MetricStrip, MetricStripSkeleton, RowSkeleton } from '@/components/portal/ui-helpers'
import { fmtDate, fmtTime, fmtRelative, initials, toStringArray } from '@/lib/format'
import { ClipboardCheck, AlertCircle, CheckCircle2, Calendar, Star, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import type { ReviewRequestT, TaskSubmissionT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const priorityColors: Record<string, string> = {
  URGENT: 'bg-rose-500/15 text-rose-600',
  HIGH: 'bg-amber-500/15 text-amber-600',
  NORMAL: 'bg-sky-500/15 text-sky-600',
  LOW: 'bg-zinc-400/15 text-zinc-500',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-600',
  SCHEDULED: 'bg-sky-500/15 text-sky-600',
  COMPLETED: 'bg-emerald-500/15 text-emerald-600',
  CANCELLED: 'bg-zinc-400/15 text-zinc-500',
}

export function ReviewCenterView() {
  const { currentEmployee, setSelectedTaskId } = useApp()
  const [requests, setRequests] = useState<ReviewRequestT[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleOpen, setScheduleOpen] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState('ALL')

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    const url = `/api/review-requests?reviewerId=${currentEmployee.id}`
    try {
      const r = await authedFetch(url).then((res) => res.json())
      setRequests(Array.isArray(r) ? r : [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee]) // eslint-disable-line react-hooks/set-state-in-effect

  async function scheduleReview(id: string, date: string, time: string, duration: number, meetingLink: string) {
    const scheduledAt = `${date}T${time}:00`
    await authedFetch('/api/review-requests', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'SCHEDULED', scheduledAt, duration, meetingLink }),
    })
    toast.success('Review scheduled — intern notified')
    setScheduleOpen(null)
    load()
  }

  async function submitReview(submissionId: string, status: string, score: number, feedback: string) {
    await authedFetch('/api/submissions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submissionId, status, managerScore: score, managerFeedback: feedback }),
    })
    toast.success(status === 'APPROVED' ? '✅ Review approved!' : 'Changes requested')
    setReviewOpen(null)
    load()
  }

  async function cancelReview(id: string, reason: string) {
    await authedFetch('/api/review-requests', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'CANCELLED', notes: reason }),
    })
    toast.success('Review cancelled — intern notified')
    setScheduleOpen(null)
    load()
  }

  const pending = requests.filter((r) => r.status === 'PENDING')
  const scheduled = requests.filter((r) => r.status === 'SCHEDULED')
  const completed = requests.filter((r) => r.status === 'COMPLETED')
  const overdue = pending.filter((r) => r.task?.deadline && new Date(r.task.deadline) < new Date())
  const filtered = filter === 'ALL' ? requests : requests.filter((r) => r.status === filter)

  return (
    <div className="space-y-6">
      <PageHeader title="Review Center" description="Manage task submissions and reviews" />

      <div className="animate-rise">
        {loading ? <MetricStripSkeleton count={4} /> : (
          <MetricStrip
            metrics={[
              { label: 'Pending', value: pending.length, sub: 'awaiting action', tone: pending.length > 0 ? 'warning' : 'default' },
              { label: 'Scheduled', value: scheduled.length, sub: 'on calendar', tone: 'info' },
              { label: 'Overdue', value: overdue.length, sub: 'past deadline', tone: overdue.length > 0 ? 'danger' : 'default' },
              { label: 'Completed', value: completed.length, sub: 'reviewed', tone: 'success' },
            ]}
          />
        )}
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ALL" className="text-[11px] gap-1.5">All <span className="text-[10px] text-muted-foreground tabular-nums">{requests.length}</span></TabsTrigger>
          <TabsTrigger value="PENDING" className="text-[11px] gap-1.5">Pending <span className="text-[10px] text-muted-foreground tabular-nums">{pending.length}</span></TabsTrigger>
          <TabsTrigger value="SCHEDULED" className="text-[11px] gap-1.5">Scheduled <span className="text-[10px] text-muted-foreground tabular-nums">{scheduled.length}</span></TabsTrigger>
          <TabsTrigger value="COMPLETED" className="text-[11px] gap-1.5">Completed <span className="text-[10px] text-muted-foreground tabular-nums">{completed.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent value={filter}>
          {loading ? (
            <Card className="p-3"><RowSkeleton count={4} /></Card>
          ) : filtered.length === 0 ? (
            <Card><EmptyState icon={ClipboardCheck} title="No reviews" description="Submissions awaiting review will appear here." /></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <ReviewCard
                  key={r.id}
                  request={r}
                  onSchedule={(id) => setScheduleOpen(id)}
                  onReview={(id) => setReviewOpen(id)}
                  onScheduleSubmit={scheduleReview}
                  onCancel={cancelReview}
                  onReviewSubmit={submitReview}
                  scheduleOpen={scheduleOpen}
                  reviewOpen={reviewOpen}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {scheduleOpen === null && reviewOpen === null && requests.length > 0 && (
        <Card className="p-4 bg-muted/30 border-dashed">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 grid place-items-center shrink-0"><Lightbulb className="h-4 w-4" /></div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Use <strong className="text-foreground">Schedule Review</strong> to set a date/time, or <strong className="text-foreground">Review Now</strong> to score immediately. After submitting a review, click <strong className="text-foreground">Review Next</strong> to jump to the next pending review.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

function ReviewCard({ request, onSchedule, onReview, onScheduleSubmit, onCancel, onReviewSubmit, scheduleOpen, reviewOpen }: {
  request: ReviewRequestT
  onSchedule: (id: string) => void
  onReview: (id: string) => void
  onScheduleSubmit: (id: string, date: string, time: string, duration: number, link: string) => void
  onCancel: (id: string, reason: string) => void
  onReviewSubmit: (submissionId: string, status: string, score: number, feedback: string) => void
  scheduleOpen: string | null
  reviewOpen: string | null
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('15:00')
  const [duration, setDuration] = useState(20)
  const [meetingLink, setMeetingLink] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [score, setScore] = useState(80)
  const [feedback, setFeedback] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const isOverdue = request.task?.deadline && new Date(request.task.deadline) < new Date() && request.status === 'PENDING'
  const statusTone =
    request.status === 'COMPLETED' ? 'success' :
    request.status === 'PENDING' ? 'warning' :
    request.status === 'SCHEDULED' ? 'info' : 'neutral'

  return (
    <Card className={`p-4 hover:shadow-card transition-all duration-200 ${isOverdue ? 'border-rose-500/40' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10"><AvatarImage src={request.employee?.photoUrl} /><AvatarFallback className="text-[10px] bg-muted text-foreground">{request.employee ? initials(request.employee.name) : '?'}</AvatarFallback></Avatar>
          <span className={`absolute -bottom-0.5 -right-0.5 status-dot status-dot-${statusTone}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold leading-tight">{request.task?.title}</p>
            {isOverdue && <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-rose-500/15 text-rose-600 gap-1"><AlertCircle className="h-2.5 w-2.5" />Overdue</Badge>}
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${priorityColors[request.priority] || ''}`}>{request.priority}</Badge>
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusColors[request.status] || ''}`}>{request.status}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{request.employee?.name} · {request.employee?.designation}</p>
          {request.scheduledAt && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span className="tabular-nums">{fmtDate(request.scheduledAt, 'd MMM')}</span> at <span className="tabular-nums">{fmtTime(request.scheduledAt)}</span>
              <span className="text-muted-foreground/50">·</span> <span className="tabular-nums">{request.duration}min</span>
            </p>
          )}
          {request.submission?.submissionNote && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 italic border-l-2 border-border pl-2">"{request.submission.submissionNote}"</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            {request.submission?.files && <span className="tabular-nums">{toStringArray(request.submission.files).length} files</span>}
            {request.submission?.links && <span className="tabular-nums">{toStringArray(request.submission.links).length} links</span>}
            <span>· Submitted {request.submission?.submittedAt ? fmtRelative(request.submission.submittedAt) : '—'}</span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {request.status === 'PENDING' && (
            <>
              <Button size="sm" variant="outline" className="text-[11px] h-7 gap-1" onClick={() => onSchedule(request.id)}><Calendar className="h-3 w-3" /> Schedule</Button>
              <Button size="sm" className="text-[11px] h-7 gap-1" onClick={() => onReview(request.id)}><Star className="h-3 w-3" /> Review Now</Button>
            </>
          )}
          {request.status === 'SCHEDULED' && (
            <>
              <Button size="sm" className="text-[11px] h-7 gap-1" onClick={() => onReview(request.id)}><Star className="h-3 w-3" /> Review</Button>
              <Button size="sm" variant="ghost" className="text-[11px] h-7 text-rose-600" onClick={() => setShowCancel(!showCancel)}>Cancel</Button>
            </>
          )}
        </div>
      </div>

      {/* Schedule dialog inline */}
      {scheduleOpen === request.id && (
        <div className="mt-3 pt-3 border-t rounded-lg surface-tinted p-3 space-y-3 animate-fade-in-up">
          <p className="text-[12px] font-semibold flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary" /> Schedule Review</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><Label className="text-[11px]">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-[11px]" /></div>
            <div><Label className="text-[11px]">Time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 text-[11px]" /></div>
            <div><Label className="text-[11px]">Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 20)} className="h-8 text-[11px]" /></div>
            <div><Label className="text-[11px]">Meeting Link</Label><Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="Zoom/Meet" className="h-8 text-[11px]" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setScheduleOpen(null)}>Cancel</Button>
            <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => onScheduleSubmit(request.id, date, time, duration, meetingLink)}><Calendar className="h-3 w-3" /> Schedule</Button>
          </div>
        </div>
      )}

      {/* Cancel inline */}
      {showCancel && request.status === 'SCHEDULED' && (
        <div className="mt-3 pt-3 border-t rounded-lg bg-rose-500/5 p-3 space-y-2 animate-fade-in-up">
          <Label className="text-[11px]">Reason for cancellation</Label>
          <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g., Manager unavailable" className="h-8 text-[11px]" />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setShowCancel(false)}>Keep</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-rose-600" onClick={() => { onCancel(request.id, cancelReason); setShowCancel(false) }}>Cancel Review</Button>
          </div>
        </div>
      )}

      {/* Review inline */}
      {reviewOpen === request.id && request.submission && (
        <div className="mt-3 pt-3 border-t rounded-lg surface-tinted p-3 space-y-3 animate-fade-in-up">
          <p className="text-[12px] font-semibold flex items-center gap-2"><Star className="h-3.5 w-3.5 text-primary" /> Quick Review</p>
          {/* Submission details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg surface-raised border p-2">
              <p className="font-medium mb-1">Files</p>
              {toStringArray(request.submission.files).map((f, i) => <p key={i} className="text-muted-foreground truncate">📎 {f}</p>)}
              {toStringArray(request.submission.files).length === 0 && <p className="text-muted-foreground">None</p>}
            </div>
            <div className="rounded-lg surface-raised border p-2">
              <p className="font-medium mb-1">Links</p>
              {toStringArray(request.submission.links).map((l, i) => <p key={i} className="text-sky-600 truncate">🔗 {l}</p>)}
              {toStringArray(request.submission.links).length === 0 && <p className="text-muted-foreground">None</p>}
            </div>
          </div>
          {request.submission.submissionNote && (
            <div className="rounded-lg surface-raised border p-2 text-[11px]">
              <p className="font-medium mb-1">Explanation</p>
              <p className="text-muted-foreground">{request.submission.submissionNote}</p>
            </div>
          )}
          {/* Score + feedback */}
          <div>
            <Label className="text-[11px]">Score: <span className="font-bold text-primary tabular-nums">{score}/100</span></Label>
            <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(parseInt(e.target.value))} className="w-full mt-1 accent-primary" />
          </div>
          <div>
            <Label className="text-[11px]">Feedback</Label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Provide feedback to the intern…" rows={3} className="text-[11px]" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-amber-600" onClick={() => onReviewSubmit(request.submission!.id, 'CHANGES_REQUESTED', score, feedback)}>Request Changes</Button>
            <Button size="sm" className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onReviewSubmit(request.submission!.id, 'APPROVED', score, feedback)}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
