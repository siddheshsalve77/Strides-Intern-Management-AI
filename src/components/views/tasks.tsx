'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, EmptyState, MetricStrip, Timeline, CompactRow, StatusDot, SectionLabel, RowSkeleton, ProgressBar, Pill, SectionCard } from '@/components/portal/ui-helpers'
import { CelebrationOverlay } from '@/components/portal/celebration'
import { KanbanBoard } from '@/components/portal/kanban-board'
import { TaskCompletionTrend } from '@/components/portal/task-completion-trend'
import { authedFetch } from '@/lib/firebase-auth'
import { getIdToken } from '@/lib/firebase-auth'
import { fmtDate, fmtRelative, taskColor, taskLabel, priorityColor, daysUntil, initials } from '@/lib/format'
import { toast } from 'sonner'
import type { TaskT, EmployeeT, SubmissionRequirement, SubmissionRequirementType, SubmissionFile, TaskSubmissionT } from '@/lib/types'
import {
  ListChecks, Plus, Clock, AlertCircle, CheckCircle2, Bot, FileText,
  Calendar, User, Sparkles, Loader2, ArrowLeft, Send, Award, Star, Save,
  Upload, File as FileIcon, Image as ImageIcon, Link as LinkIcon, Code2,
  Github, Trash2, X, RefreshCw, MessageSquare, XCircle,
} from 'lucide-react'

const COLUMNS = [
  { id: 'CREATED', label: 'To Do', color: 'bg-zinc-400' },
  { id: 'ASSIGNED', label: 'Assigned', color: 'bg-sky-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'SUBMITTED', label: 'Submitted', color: 'bg-amber-500' },
  { id: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-violet-500' },
  { id: 'APPROVED', label: 'Approved', color: 'bg-teal-500' },
  { id: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' },
]

const REQ_TYPES: { value: SubmissionRequirementType; label: string; icon: any; hint: string }[] = [
  { value: 'TEXT', label: 'Short Text', icon: FileText, hint: 'Single-line text input' },
  { value: 'LONG_TEXT', label: 'Long Text', icon: FileText, hint: 'Multi-line textarea (e.g., explanation)' },
  { value: 'CODE', label: 'Code', icon: Code2, hint: 'Code editor with syntax hint' },
  { value: 'GITHUB_URL', label: 'GitHub URL', icon: Github, hint: 'https://github.com/user/repo' },
  { value: 'URL', label: 'URL', icon: LinkIcon, hint: 'Any web URL (demo, doc, etc.)' },
  { value: 'IMAGE', label: 'Image', icon: ImageIcon, hint: 'Single image upload (PNG, JPG)' },
  { value: 'FILE', label: 'File', icon: FileIcon, hint: 'Single file upload (PDF, ZIP, etc.)' },
  { value: 'MULTIPLE_FILES', label: 'Multiple Files', icon: Upload, hint: 'Up to N files' },
]

// Premium Pill tone helpers (visual only — preserve all existing data flow)
function priorityPillTone(p: string): 'rose' | 'coral' | 'amber' | 'teal' {
  if (p === 'HIGH') return 'rose'
  if (p === 'CRITICAL') return 'coral'
  if (p === 'LOW') return 'teal'
  return 'amber' // MEDIUM default
}
function statusPillTone(s: string): 'neutral' | 'electric' | 'amber' | 'violet' | 'emerald' {
  if (s === 'IN_PROGRESS') return 'electric'
  if (s === 'SUBMITTED') return 'amber'
  if (s === 'UNDER_REVIEW') return 'violet'
  if (s === 'APPROVED' || s === 'COMPLETED') return 'emerald'
  return 'neutral' // CREATED / ASSIGNED / ACCEPTED — Not Started
}
function deadlinePillTone(overdue: boolean, dueSoon: boolean): 'rose' | 'amber' | 'neutral' {
  if (overdue) return 'rose'
  if (dueSoon) return 'amber'
  return 'neutral'
}

export function TasksView() {
  const { currentEmployee, selectedTaskId, setSelectedTaskId, bumpDataVersion, dataVersion } = useApp()
  const [tasks, setTasks] = useState<TaskT[]>([])
  const [reportees, setReportees] = useState<EmployeeT[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    if (!currentEmployee) return
    // Server derives user from token; default returns manager's created tasks or employee's assigned tasks
    const url = `/api/tasks`
    const t = await authedFetch(url).then((r) => r.json()).catch(() => [])
    setTasks(Array.isArray(t) ? t : [])
    const isManager = ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)
    if (isManager) {
      const r = await authedFetch(`/api/employees?managerId=me`).then((r) => r.json()).catch(() => [])
      setReportees(Array.isArray(r) ? r : [])
    }
    setLoading(false)
  }, [currentEmployee])

  useEffect(() => { load() }, [currentEmployee?.id, dataVersion])

  async function handleStatusChange(taskId: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    const actionMap: Record<string, string> = {
      CREATED: 'START', ASSIGNED: 'START', IN_PROGRESS: 'START',
      SUBMITTED: 'SUBMIT', UNDER_REVIEW: 'SUBMIT',
      APPROVED: 'APPROVE', COMPLETED: 'COMPLETE',
    }
    try {
      const action = actionMap[newStatus] || 'START'
      const res = await authedFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Task moved to ${newStatus.replace(/_/g, ' ').toLowerCase()}`)
    } catch {
      toast.error('Failed to update status')
      load()
    }
  }

  if (selectedTaskId) return <TaskDetail taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} onChange={load} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description={currentEmployee && ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role) ? "Manage your team's work & assignments" : 'Track your assignments, deadlines and submissions'}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button className="gap-2 shadow-pop"><Plus className="h-4 w-4" /> New Task</Button></DialogTrigger>
            <CreateTaskDialog reportees={reportees} onClose={() => setCreateOpen(false)} onCreated={() => { load(); bumpDataVersion() }} />
          </Dialog>
        }
      />

      <div className="animate-rise">
        <MetricStrip
          metrics={[
            { label: 'Pending', value: tasks.filter((t) => ['CREATED', 'ASSIGNED'].includes(t.status)).length, tone: 'default', sub: 'awaiting start' },
            { label: 'In Progress', value: tasks.filter((t) => t.status === 'IN_PROGRESS').length, tone: 'info', sub: 'active work' },
            { label: 'Overdue', value: tasks.filter((t) => t.deadline && (daysUntil(t.deadline) ?? 1) < 0 && !['COMPLETED', 'APPROVED'].includes(t.status)).length, tone: 'danger', sub: 'past deadline' },
            { label: 'Completed', value: tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length, tone: 'success', sub: 'this cycle' },
          ]}
        />
      </div>

      <div className="animate-rise animate-rise-delay-1">
        <TaskCompletionTrend />
      </div>

      <Tabs defaultValue="board" className="animate-rise animate-rise-delay-2">
        <TabsList className="rounded-full p-1 bg-muted/60 backdrop-blur border border-border/60 shadow-pop">
          <TabsTrigger value="board" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-card transition-all">Board</TabsTrigger>
          <TabsTrigger value="list" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-card transition-all">List</TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-48 rounded-lg skeleton-premium" />)}
            </div>
          ) : tasks.length === 0 ? (
            <Card className="card-premium"><EmptyState icon={ListChecks} title="No tasks yet" description="Tasks assigned to you will appear here." accent="violet" /></Card>
          ) : (
            <KanbanBoard tasks={tasks} onTaskClick={(id) => setSelectedTaskId(id)} onStatusChange={handleStatusChange} />
          )}
        </TabsContent>

        <TabsContent value="list">
          {loading ? (
            <Card className="p-2"><RowSkeleton count={6} /></Card>
          ) : tasks.length === 0 ? (
            <Card className="card-premium"><EmptyState icon={ListChecks} title="No tasks" description="Once tasks are created, they will appear here." accent="violet" /></Card>
          ) : (
            <Card className="p-2 divide-y divide-border/60">
              {tasks.map((t) => <TaskCard key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} list />)}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TaskCard({ task, onClick, list }: { task: TaskT; onClick?: () => void; list?: boolean }) {
  const d = task.deadline ? daysUntil(task.deadline) : null
  const overdue = d !== null && d < 0 && !['COMPLETED', 'APPROVED'].includes(task.status)
  const statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' =
    task.status === 'COMPLETED' || task.status === 'APPROVED' ? 'success' :
    task.status === 'IN_PROGRESS' ? 'info' :
    task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW' ? 'warning' :
    'neutral'
  if (list) {
    return (
      <CompactRow
        onClick={onClick}
        className="press-tactile"
        leading={
          <div className="h-8 w-8 rounded-lg bg-muted/40 ring-1 ring-border/60 grid place-items-center shrink-0">
            <StatusDot tone={statusTone} />
          </div>
        }
        title={
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate">{task.title}</span>
            <Pill tone={priorityPillTone(task.priority)}>{task.priority}</Pill>
          </span>
        }
        subtitle={
          <span className="flex items-center gap-1.5 truncate">
            {task.project && <span className="truncate">{task.project.name}</span>}
            {task.assignee && <span className="truncate">· {task.assignee.name.split(' ')[0]}</span>}
          </span>
        }
        trailing={
          <div className="flex items-center gap-1.5 justify-end">
            {task.deadline && (
              <Pill tone={deadlinePillTone(overdue, d !== null && d <= 3)} icon={Calendar}>
                {overdue ? 'Overdue' : d === 0 ? 'Today' : d !== null ? `${d}d` : ''}
              </Pill>
            )}
            <Pill tone={statusPillTone(task.status)}>{taskLabel(task.status)}</Pill>
          </div>
        }
      />
    )
  }
  return (
    <button onClick={onClick} className="w-full text-left card-premium hover-lift press-tactile p-3 group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">{task.title}</p>
          <Pill tone={priorityPillTone(task.priority)}>{task.priority}</Pill>
        </div>
        {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
        {task.project && <Badge variant="secondary" className="text-[10px] mb-2">{task.project.name}</Badge>}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2 min-w-0">
            {task.assignee && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Avatar className="h-5 w-5"><AvatarImage src={task.assignee.photoUrl} /><AvatarFallback className="text-[8px]">{initials(task.assignee.name)}</AvatarFallback></Avatar>
                <span className="text-[11px] text-muted-foreground truncate">{task.assignee.name.split(' ')[0]}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {task.deadline && (
              <Pill tone={deadlinePillTone(overdue, d !== null && d <= 3)} icon={Calendar}>
                {overdue ? 'Overdue' : d === 0 ? 'Today' : d !== null ? `${d}d` : ''}
              </Pill>
            )}
            <Pill tone={statusPillTone(task.status)}>{taskLabel(task.status)}</Pill>
          </div>
        </div>
      </div>
    </button>
  )
}

// ============================================================
// CreateTaskDialog — with submission requirements builder
// ============================================================
function CreateTaskDialog({ reportees, onClose, onCreated }: { reportees: EmployeeT[]; onClose: () => void; onCreated: () => void }) {
  const { currentEmployee } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('') // Firebase UID
  const [priority, setPriority] = useState('MEDIUM')
  const [deadline, setDeadline] = useState('')
  const [expectedDeliverable, setExpectedDeliverable] = useState('')
  const [evaluationCriteria, setEvaluationCriteria] = useState('')
  const [requirements, setRequirements] = useState<SubmissionRequirement[]>([
    { id: `req_${Math.random().toString(36).slice(2, 10)}`, type: 'LONG_TEXT', label: 'Explanation', helpText: 'Describe your approach and any notes for the reviewer', required: true },
  ])
  const [submitting, setSubmitting] = useState(false)

  function addRequirement() {
    setRequirements([...requirements, {
      id: `req_${Math.random().toString(36).slice(2, 10)}`,
      type: 'TEXT', label: '', helpText: '', required: false,
    }])
  }
  function updateReq(id: string, patch: Partial<SubmissionRequirement>) {
    setRequirements(requirements.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  function removeReq(id: string) {
    setRequirements(requirements.filter(r => r.id !== id))
  }

  async function create() {
    if (!currentEmployee || !title) { toast.error('Title required'); return }
    if (!assigneeId) { toast.error('Please select an assignee'); return }
    setSubmitting(true)
    try {
      // Filter out requirements without labels
      const cleanReqs = requirements.filter(r => r.label.trim()).map(r => ({
        ...r,
        label: r.label.trim(),
        helpText: (r.helpText || '').trim(),
      }))
      const res = await authedFetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description,
          assigneeId, // Firebase UID — server also verifies
          priority,
          deadline: deadline || undefined,
          expectedDeliverable,
          evaluationCriteria,
          submissionRequirements: cleanReqs,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed')
      }
      toast.success('Task created & assigned — assignee will be notified')
      onClose(); onCreated()
    } catch (e: any) { toast.error(e.message || 'Failed') } finally { setSubmitting(false) }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Task Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build login API" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detailed requirements, scope, acceptance criteria…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Assign To</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {reportees.map((r) => <SelectItem key={r.uid || r.id} value={r.uid || r.id}>{r.name} · {r.designation}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Expected Deliverable</Label>
            <Input value={expectedDeliverable} onChange={(e) => setExpectedDeliverable(e.target.value)} placeholder="What should be delivered" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Evaluation Criteria (optional)</Label>
          <Textarea value={evaluationCriteria} onChange={(e) => setEvaluationCriteria(e.target.value)} rows={2} placeholder="How will the submission be evaluated?" />
        </div>

        {/* Submission Requirements Builder */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Submission Requirements</p>
              <p className="text-xs text-muted-foreground">Define what the assignee must turn in. Like a Google Form.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRequirement} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Field
            </Button>
          </div>
          <div className="space-y-2">
            {requirements.map((r, idx) => {
              const typeCfg = REQ_TYPES.find(t => t.value === r.type)!
              const Icon = typeCfg.icon
              return (
                <div key={r.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Field #{idx + 1}</span>
                    <button type="button" onClick={() => removeReq(r.id)} className="text-muted-foreground hover:text-rose-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Label className="text-[10px]">Label</Label>
                      <Input value={r.label} onChange={(e) => updateReq(r.id, { label: e.target.value })} placeholder="e.g. GitHub Repo URL" className="text-sm h-8" />
                    </div>
                    <div className="col-span-5">
                      <Label className="text-[10px]">Type</Label>
                      <Select value={r.type} onValueChange={(v) => updateReq(r.id, { type: v as SubmissionRequirementType })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REQ_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-center gap-2">
                                <t.icon className="h-3.5 w-3.5" />
                                <span>{t.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex items-end gap-2 pb-0.5">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r.required}
                          onChange={(e) => updateReq(r.id, { required: e.target.checked })}
                          className="rounded border-border"
                        />
                        <span>Required</span>
                      </label>
                    </div>
                  </div>
                  <Input
                    value={r.helpText || ''}
                    onChange={(e) => updateReq(r.id, { helpText: e.target.value })}
                    placeholder={`Help text — ${typeCfg.hint}`}
                    className="text-xs h-8"
                  />
                  {['IMAGE', 'FILE', 'MULTIPLE_FILES'].includes(r.type) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Max files</Label>
                        <Input
                          type="number"
                          value={r.maxFiles || (r.type === 'MULTIPLE_FILES' ? 5 : 1)}
                          onChange={(e) => updateReq(r.id, { maxFiles: parseInt(e.target.value) || 1 })}
                          className="text-sm h-8"
                          min={1}
                          max={20}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Accepted types (comma-sep)</Label>
                        <Input
                          value={(r.acceptedTypes || []).join(',')}
                          onChange={(e) => updateReq(r.id, { acceptedTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          placeholder="image/png, application/pdf"
                          className="text-sm h-8"
                        />
                      </div>
                    </div>
                  )}
                  {['TEXT', 'LONG_TEXT', 'CODE'].includes(r.type) && (
                    <div>
                      <Label className="text-[10px]">Max length (chars, optional)</Label>
                      <Input
                        type="number"
                        value={r.maxLength || ''}
                        onChange={(e) => updateReq(r.id, { maxLength: parseInt(e.target.value) || undefined })}
                        placeholder="e.g. 5000"
                        className="text-sm h-8"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="btn-glass">Cancel</Button>
        <Button onClick={create} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Create & Assign
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ============================================================
// TaskDetail — full task view + submission workspace
// ============================================================
function TaskDetail({ taskId, onBack, onChange }: { taskId: string; onBack: () => void; onChange: () => void }) {
  const { currentEmployee, bumpDataVersion } = useApp()
  const [task, setTask] = useState<TaskT | null>(null)
  const [loading, setLoading] = useState(true)
  const [submissionNote, setSubmissionNote] = useState('')
  const [managerScore, setManagerScore] = useState(80)
  const [managerFeedback, setManagerFeedback] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [celebrate, setCelebrate] = useState(0)
  const [celebrateMsg, setCelebrateMsg] = useState('')
  const [acting, setActing] = useState(false)
  // Submission workspace state
  const [submissions, setSubmissions] = useState<TaskSubmissionT[]>([])
  // Per-requirement field values: { [reqId]: { value: string, files: SubmissionFile[] } }
  const [fieldValues, setFieldValues] = useState<Record<string, { value: string; files: SubmissionFile[] }>>({})
  const [draftSaved, setDraftSaved] = useState<string | null>(null)
  const [submittingSub, setSubmittingSub] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null)
  const [showChangesDialog, setShowChangesDialog] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const t = await authedFetch(`/api/tasks/${taskId}`).then((r) => r.json())
      setTask(t)
      setSubmissionNote(t.submissionNote || '')
      setManagerScore(t.managerScore || 80)
      setManagerFeedback(t.managerFeedback || '')
      const subs = await authedFetch(`/api/submissions?taskId=${taskId}`).then((r) => r.json()).catch(() => [])
      setSubmissions(Array.isArray(subs) ? subs : [])
      // Restore draft
      const latestDraft = (Array.isArray(subs) ? subs : []).find((s: any) => s.status === 'DRAFT')
      if (latestDraft) {
        setSubmissionNote(latestDraft.submissionNote || '')
        // Restore per-requirement fields
        const restored: Record<string, { value: string; files: SubmissionFile[] }> = {}
        if (Array.isArray(latestDraft.fields)) {
          for (const f of latestDraft.fields) {
            restored[f.requirementId] = { value: f.value || '', files: Array.isArray(f.files) ? f.files : [] }
          }
        }
        setFieldValues(restored)
        setDraftSaved(latestDraft.updatedAt)
      } else {
        // Initialize empty field values for all requirements
        const init: Record<string, { value: string; files: SubmissionFile[] }> = {}
        if (Array.isArray(t.submissionRequirements)) {
          for (const r of t.submissionRequirements) {
            init[r.id] = { value: '', files: [] }
          }
        }
        setFieldValues(init)
      }
    } catch (e) {
      console.error('TaskDetail load error:', e)
    } finally {
      setLoading(false)
    }
  }, [taskId])
  useEffect(() => { load() }, [taskId])

  async function act(action: string, extra?: any) {
    setActing(true)
    try {
      const res = await authedFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed')
      }
      if (action === 'COMPLETE') {
        setCelebrateMsg('Task Completed! ✅'); setCelebrate((c) => c + 1)
        toast.success('🎉 Task completed! Great work!')
      } else if (action === 'APPROVE') {
        setCelebrateMsg('Task Approved! ⭐'); setCelebrate((c) => c + 1)
        toast.success('🎉 Task approved!')
      } else if (action === 'CHANGES_REQUESTED') {
        toast.success('Changes requested — assignee has been notified')
        setShowChangesDialog(false)
      } else {
        toast.success('Task updated')
      }
      load(); onChange(); bumpDataVersion()
    } catch (e: any) { toast.error(e.message || 'Failed') } finally { setActing(false) }
  }

  async function runAIEval() {
    setAiLoading(true)
    try {
      const res = await authedFetch('/api/ai/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('AI evaluation complete')
      load(); onChange()
    } catch (e: any) { toast.error(e.message || 'AI failed') } finally { setAiLoading(false) }
  }

  // Upload a file to Supabase via /api/storage/upload
  async function uploadFile(reqId: string, file: File) {
    if (!currentEmployee) return
    setUploadingReqId(reqId)
    try {
      const draftId = submissions.find((s: any) => s.status === 'DRAFT')?.id || 'draft'
      const path = `task-submissions/${currentEmployee.id}/${taskId}/${draftId}`
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', path)
      formData.append('context', 'task_submission')
      formData.append('taskId', taskId)

      const res = await authedFetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Upload failed')
      }
      const result = await res.json()
      const fileMeta: SubmissionFile = {
        name: result.fileName,
        path: result.path,
        mimeType: result.mimeType,
        size: result.size,
        uploadedBy: currentEmployee.id,
        uploadedAt: result.uploadedAt || new Date().toISOString(),
        requirementId: reqId,
      }
      setFieldValues(prev => ({
        ...prev,
        [reqId]: {
          value: prev[reqId]?.value || '',
          files: [...(prev[reqId]?.files || []), fileMeta],
        },
      }))
      toast.success(`Uploaded ${result.fileName}`)
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`)
    } finally {
      setUploadingReqId(null)
    }
  }

  function removeFile(reqId: string, idx: number) {
    setFieldValues(prev => ({
      ...prev,
      [reqId]: {
        ...prev[reqId],
        files: (prev[reqId]?.files || []).filter((_, i) => i !== idx),
      },
    }))
  }

  // Download a file (manager or assignee)
  async function downloadFile(filePath: string) {
    try {
      const res = await authedFetch('/api/storage/download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, taskId }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Download failed')
      }
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      toast.error(`Download failed: ${e.message}`)
    }
  }

  // Build the submission payload (used by both saveDraft and submitFinal)
  function buildSubmissionPayload(status: 'DRAFT' | 'SUBMITTED') {
    const fields = Object.entries(fieldValues).map(([reqId, fv]) => ({
      requirementId: reqId,
      value: fv.value,
      files: fv.files,
    }))
    // Flatten files + links for backward compat
    const allFiles: SubmissionFile[] = []
    const allLinks: { url: string; label?: string; requirementId?: string }[] = []
    if (task?.submissionRequirements) {
      for (const req of task.submissionRequirements) {
        const fv = fieldValues[req.id]
        if (!fv) continue
        if (['IMAGE', 'FILE', 'MULTIPLE_FILES'].includes(req.type)) {
          for (const f of fv.files) allFiles.push({ ...f, requirementId: req.id })
        }
        if (['URL', 'GITHUB_URL'].includes(req.type) && fv.value) {
          allLinks.push({ url: fv.value, label: req.label, requirementId: req.id })
        }
      }
    }
    return { taskId, submissionNote, fields, files: allFiles, links: allLinks, status }
  }

  // Validate required fields before submission
  function validateSubmission(): { ok: boolean; missing: SubmissionRequirement[] } {
    if (!task?.submissionRequirements) return { ok: true, missing: [] }
    const missing: SubmissionRequirement[] = []
    for (const req of task.submissionRequirements) {
      if (!req.required) continue
      const fv = fieldValues[req.id]
      if (!fv) { missing.push(req); continue }
      if (['TEXT', 'LONG_TEXT', 'CODE', 'URL', 'GITHUB_URL'].includes(req.type)) {
        if (!fv.value.trim()) missing.push(req)
      }
      if (['IMAGE', 'FILE', 'MULTIPLE_FILES'].includes(req.type)) {
        if (fv.files.length === 0) missing.push(req)
      }
    }
    return { ok: missing.length === 0, missing }
  }

  async function saveDraft() {
    if (!currentEmployee) return
    setSubmittingSub(true)
    try {
      const existingDraft = submissions.find((s: any) => s.status === 'DRAFT')
      const payload = buildSubmissionPayload('DRAFT')
      if (existingDraft) {
        await authedFetch('/api/submissions', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingDraft.id, ...payload }),
        })
      } else {
        await authedFetch('/api/submissions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setDraftSaved(new Date().toISOString())
      toast.success('Draft saved')
      load()
    } catch { toast.error('Failed to save draft') } finally { setSubmittingSub(false) }
  }

  async function submitFinal() {
    if (!currentEmployee) return
    // Validate
    const { ok, missing } = validateSubmission()
    if (!ok) {
      toast.error(`Missing required fields: ${missing.map(m => m.label).join(', ')}`)
      setShowSubmitConfirm(false)
      return
    }
    setSubmittingSub(true)
    try {
      const payload = buildSubmissionPayload('SUBMITTED')
      // If there's an existing draft, PATCH it to SUBMITTED; otherwise POST a new one
      const existingDraft = submissions.find((s: any) => s.status === 'DRAFT')
      if (existingDraft) {
        await authedFetch('/api/submissions', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingDraft.id, ...payload }),
        })
      } else {
        await authedFetch('/api/submissions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      toast.success('✓ Submission received! Your manager has been notified.')
      setShowSubmitConfirm(false)
      load(); onChange(); bumpDataVersion()
    } catch { toast.error('Submission failed') } finally { setSubmittingSub(false) }
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-9 w-36 rounded-md skeleton-premium" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 rounded-lg skeleton-premium" />
          <RowSkeleton count={4} />
        </div>
        <div className="space-y-3">
          <div className="h-24 rounded-lg skeleton-premium" />
          <div className="h-48 rounded-lg skeleton-premium" />
        </div>
      </div>
    </div>
  )
  if (!task) return <EmptyState icon={AlertCircle} title="Task not found" accent="rose" action={<Button onClick={onBack} variant="outline" className="btn-glass"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>} />

  const isAssignee = currentEmployee?.id === task.assignedTo
  const isCreator = currentEmployee?.id === task.createdBy
  const isManagerRole = currentEmployee && ['MANAGER', 'HR', 'ADMIN'].includes(currentEmployee.role)
  const canSubmit = isAssignee && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'CREATED'].includes(task.status)
  const canEvaluate = (isCreator || isAssignee || isManagerRole) && (task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW')
  const canReview = (isCreator || isManagerRole) && (task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW')
  const d = task.deadline ? daysUntil(task.deadline) : null
  const overdue = d !== null && d < 0 && !['COMPLETED', 'APPROVED'].includes(task.status)
  const submissionTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' =
    task.status === 'COMPLETED' || task.status === 'APPROVED' ? 'success' :
    task.status === 'IN_PROGRESS' ? 'info' :
    task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW' ? 'warning' :
    task.managerStatus === 'CHANGES_REQUESTED' ? 'warning' :
    'neutral'
  // Submission progress — count completed requirements (visual indicator only)
  const reqs = Array.isArray(task.submissionRequirements) ? task.submissionRequirements : []
  const reqTotal = reqs.length
  const reqDone = reqs.filter((req) => {
    const fv = fieldValues[req.id]
    if (!fv) return false
    if (['TEXT', 'LONG_TEXT', 'CODE', 'URL', 'GITHUB_URL'].includes(req.type)) return fv.value.trim().length > 0
    if (['IMAGE', 'FILE', 'MULTIPLE_FILES'].includes(req.type)) return fv.files.length > 0
    return false
  }).length

  return (
    <div className="space-y-6">
      <CelebrationOverlay trigger={celebrate} message={celebrateMsg} />
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 focus-ring hover-lift"><ArrowLeft className="h-4 w-4" /> Back to tasks</Button>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 animate-rise">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 backdrop-blur px-2.5 py-1 shadow-pop">
              <StatusDot tone={submissionTone} />
              <span className="text-[11px] font-medium">{taskLabel(task.status)}</span>
            </span>
            <Pill tone={priorityPillTone(task.priority)}>{task.priority}</Pill>
            {task.project && <Badge variant="secondary" className="text-[10px]">{task.project.name}</Badge>}
            {overdue && <Pill tone="rose" icon={AlertCircle}>Overdue</Pill>}
            {task.managerStatus === 'CHANGES_REQUESTED' && (
              <Pill tone="amber" icon={RefreshCw}>Changes Requested</Pill>
            )}
          </div>
          <h2 className="text-[22px] lg:text-[26px] font-bold tracking-tight leading-tight">{task.title}</h2>
          {task.description && <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed max-w-3xl">{task.description}</p>}
        </div>
      </div>

      <div className="animate-rise animate-rise-delay-1">
        <MetricStrip
          metrics={[
            { label: 'Assignee', value: task.assignee?.name || 'Unassigned', sub: task.assignee?.designation },
            { label: 'Deadline', value: task.deadline ? fmtDate(task.deadline, 'd MMM yyyy') : '—', sub: task.deadline ? fmtRelative(task.deadline) : undefined, tone: overdue ? 'danger' : 'default' },
            { label: 'Submitted', value: task.submittedAt ? fmtRelative(task.submittedAt) : '—', sub: task.submittedAt ? fmtDate(task.submittedAt, 'd MMM') : undefined },
            { label: 'Completed', value: task.completedAt ? fmtRelative(task.completedAt) : '—', sub: task.completedAt ? fmtDate(task.completedAt, 'd MMM') : undefined, tone: task.completedAt ? 'success' : 'default' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-rise animate-rise-delay-2">
        <div className="lg:col-span-2 space-y-6">
          {task.expectedDeliverable && (
            <Card className="card-premium card-premium-accent p-5">
              <SectionLabel className="mb-2 flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-primary" /> Expected Deliverable</SectionLabel>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{task.expectedDeliverable}</p>
              {task.evaluationCriteria && <div className="mt-3 pt-3 border-t border-border/60"><SectionLabel className="mb-1.5">Evaluation Criteria</SectionLabel><p className="text-[13px] text-muted-foreground leading-relaxed">{task.evaluationCriteria}</p></div>}
            </Card>
          )}

          {/* Submission Workspace */}
          {canSubmit ? (
            <Card className="card-premium card-premium-accent-ai p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <SectionLabel className="mb-1 flex items-center gap-2"><Send className="h-3.5 w-3.5 text-primary" /> Submission Workspace</SectionLabel>
                  <p className="text-[15px] font-semibold leading-tight">Complete & Turn In</p>
                </div>
                {draftSaved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 backdrop-blur px-2.5 py-1 shadow-pop">
                    <StatusDot tone="neutral" />
                    <span className="text-[10px] text-muted-foreground">Draft saved {fmtRelative(draftSaved)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 backdrop-blur px-2.5 py-1 shadow-pop">
                    <StatusDot tone="info" />
                    <span className="text-[10px] text-muted-foreground">Draft</span>
                  </span>
                )}
              </div>

              {/* Submission progress — "N of M requirements complete" */}
              {reqTotal > 0 && (
                <div className="flex items-center gap-3 mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
                    <span className="font-bold text-foreground">{reqDone}</span>
                    <span> of </span>
                    <span className="font-bold text-foreground">{reqTotal}</span>
                    <span> requirement{reqTotal === 1 ? '' : 's'} complete</span>
                  </span>
                  <ProgressBar value={reqDone} max={reqTotal} tone="success" className="flex-1" />
                </div>
              )}

              {/* Per-requirement fields */}
              {Array.isArray(task.submissionRequirements) && task.submissionRequirements.length > 0 ? (
                <div className="space-y-3">
                  {task.submissionRequirements.map((req, idx) => {
                    const typeCfg = REQ_TYPES.find(t => t.value === req.type)!
                    const Icon = typeCfg?.icon || FileText
                    const fv = fieldValues[req.id] || { value: '', files: [] }
                    const filled = (['TEXT', 'LONG_TEXT', 'CODE', 'URL', 'GITHUB_URL'].includes(req.type) && fv.value.trim().length > 0) || (['IMAGE', 'FILE', 'MULTIPLE_FILES'].includes(req.type) && fv.files.length > 0)
                    return (
                      <div key={req.id} className={`rounded-xl border p-3.5 space-y-3 transition-all duration-200 ${filled ? 'border-emerald-500/30 bg-emerald-500/[0.04] hover:border-emerald-500/45 hover:shadow-card' : 'border-border bg-card hover:border-primary/30 hover:shadow-card'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-xl icon-tile-teal shrink-0 grid place-items-center relative">
                              <Icon className="h-4 w-4" />
                              <span className="absolute -top-1 -right-1 text-[9px] font-bold tabular-nums bg-background border border-border rounded-full h-4 min-w-4 px-1 grid place-items-center text-foreground">{String(idx + 1).padStart(2, '0')}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Label className="text-[13px] font-medium leading-tight">{req.label}{req.required && <span className="text-rose-600 ml-0.5">*</span>}</Label>
                                <Pill tone={req.required ? 'emerald' : 'neutral'}>{req.required ? 'Required' : 'Optional'}</Pill>
                                <Pill tone="neutral">{typeCfg?.label || req.type}</Pill>
                                {filled && <Pill tone="emerald" icon={CheckCircle2}>Done</Pill>}
                              </div>
                              {req.helpText && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{req.helpText}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Render input by type */}
                        {req.type === 'TEXT' && (
                          <Input
                            value={fv.value}
                            onChange={(e) => setFieldValues(prev => ({ ...prev, [req.id]: { ...fv, value: e.target.value } }))}
                            placeholder="Enter your response…"
                            maxLength={req.maxLength}
                            className="focus-glow"
                          />
                        )}
                        {req.type === 'LONG_TEXT' && (
                          <Textarea
                            value={fv.value}
                            onChange={(e) => setFieldValues(prev => ({ ...prev, [req.id]: { ...fv, value: e.target.value } }))}
                            placeholder="Enter your detailed response…"
                            rows={4}
                            maxLength={req.maxLength}
                            className="focus-glow"
                          />
                        )}
                        {req.type === 'CODE' && (
                          <Textarea
                            value={fv.value}
                            onChange={(e) => setFieldValues(prev => ({ ...prev, [req.id]: { ...fv, value: e.target.value } }))}
                            placeholder="Paste your code here…"
                            rows={6}
                            className="font-mono text-xs focus-glow"
                            maxLength={req.maxLength}
                          />
                        )}
                        {req.type === 'GITHUB_URL' && (
                          <div className="flex items-center gap-2">
                            <Github className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={fv.value}
                              onChange={(e) => setFieldValues(prev => ({ ...prev, [req.id]: { ...fv, value: e.target.value } }))}
                              placeholder="https://github.com/username/repository"
                              type="url"
                              className="focus-glow"
                            />
                          </div>
                        )}
                        {req.type === 'URL' && (
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={fv.value}
                              onChange={(e) => setFieldValues(prev => ({ ...prev, [req.id]: { ...fv, value: e.target.value } }))}
                              placeholder="https://"
                              type="url"
                              className="focus-glow"
                            />
                          </div>
                        )}
                        {['IMAGE', 'FILE', 'MULTIPLE_FILES'].includes(req.type) && (
                          <div className="space-y-2">
                            <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 p-4 cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-all press-tactile ${uploadingReqId === req.id ? 'opacity-50' : ''}`}>
                              <input
                                type="file"
                                className="hidden"
                                multiple={req.type === 'MULTIPLE_FILES'}
                                accept={req.acceptedTypes?.join(',') || (req.type === 'IMAGE' ? 'image/*' : undefined)}
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || [])
                                  files.forEach(f => uploadFile(req.id, f))
                                  e.target.value = ''
                                }}
                                disabled={uploadingReqId === req.id || (req.type !== 'MULTIPLE_FILES' && fv.files.length >= 1) || (req.type === 'MULTIPLE_FILES' && fv.files.length >= (req.maxFiles || 5))}
                              />
                              {uploadingReqId === req.id ? (
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                              ) : (
                                <Upload className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {uploadingReqId === req.id ? 'Uploading…' : req.type === 'MULTIPLE_FILES' ? `Upload up to ${req.maxFiles || 5} files` : `Click to upload ${req.type === 'IMAGE' ? 'an image' : 'a file'}`}
                              </span>
                            </label>
                            {fv.files.length > 0 && (
                              <div className="space-y-1.5">
                                {fv.files.map((f, i) => (
                                  <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-xs hover:border-border/60 transition-colors">
                                    <FileIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="flex-1 truncate">{f.name}</span>
                                    <span className="text-muted-foreground tabular-nums">{(f.size / 1024).toFixed(1)}KB</span>
                                    <button onClick={() => removeFile(req.id, i)} className="text-muted-foreground hover:text-rose-600 transition-colors press-tactile p-1 rounded-md hover:bg-rose-500/10">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Overall note */}
                  <div className="space-y-1.5 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Additional Notes (optional)</Label>
                    <Textarea
                      value={submissionNote}
                      onChange={(e) => setSubmissionNote(e.target.value)}
                      placeholder="Any extra context for the reviewer…"
                      rows={3}
                      className="bg-card border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Files (comma-separated filenames)</Label>
                    <Input value={fieldValues['_legacy_files']?.value || ''} onChange={(e) => setFieldValues(prev => ({ ...prev, _legacy_files: { value: e.target.value, files: [] } }))} placeholder="report.pdf, code.zip" className="text-sm h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Links (comma-separated URLs)</Label>
                    <Input value={fieldValues['_legacy_links']?.value || ''} onChange={(e) => setFieldValues(prev => ({ ...prev, _legacy_links: { value: e.target.value, files: [] } }))} placeholder="https://github.com/user/repo" className="text-sm h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Written Explanation</Label>
                    <Textarea value={submissionNote} onChange={(e) => setSubmissionNote(e.target.value)} placeholder="Describe your approach…" rows={4} />
                  </div>
                </div>
              )}

              {/* Actions — clear visual hierarchy */}
              <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border/60">
                {['ASSIGNED', 'ACCEPTED', 'CREATED'].includes(task.status) && (
                  <Button variant="outline" onClick={() => act('START')} disabled={acting} className="btn-glass">Start Work</Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" onClick={saveDraft} disabled={submittingSub} className="gap-2 btn-glass">
                    {submittingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
                  </Button>
                  <Button variant="success" onClick={() => setShowSubmitConfirm(true)} disabled={submittingSub} className="gap-2">
                    <Send className="h-4 w-4" /> Turn In
                  </Button>
                </div>
              </div>

              {/* Submit confirmation */}
              {showSubmitConfirm && (
                <div className="mt-4 sheet-premium rounded-2xl p-5 space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2">
                    <StatusDot tone="info" />
                    <p className="text-[13px] font-semibold">Ready to turn in?</p>
                  </div>
                  {(() => {
                    const { missing } = validateSubmission()
                    if (missing.length > 0) {
                      return (
                        <div className="text-xs text-rose-600 space-y-1 rounded-md border border-rose-500/20 bg-rose-500/5 p-2.5">
                          <p className="flex items-center gap-1.5 font-medium"><AlertCircle className="h-3.5 w-3.5" /> Missing required fields:</p>
                          <ul className="list-disc list-inside pl-2 space-y-0.5">
                            {missing.map(m => <li key={m.id}>{m.label}</li>)}
                          </ul>
                        </div>
                      )
                    }
                    return (
                      <div className="text-xs space-y-1 text-muted-foreground">
                        {task.submissionRequirements && task.submissionRequirements.length > 0 ? (
                          <p className="flex items-center gap-1.5"><StatusDot tone="success" /> All required fields completed</p>
                        ) : (
                          <>
                            <p>Files: {fieldValues['_legacy_files']?.value ? 'Provided' : 'None'}</p>
                            <p>Links: {fieldValues['_legacy_links']?.value ? 'Provided' : 'None'}</p>
                            <p>Explanation: {submissionNote ? 'Completed' : 'Empty'}</p>
                          </>
                        )}
                        <p className="tabular-nums">Deadline: {task.deadline ? fmtDate(task.deadline, 'd MMM yyyy · h:mm a') : '—'}</p>
                      </div>
                    )
                  })()}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setShowSubmitConfirm(false)} className="btn-glass">Back to Edit</Button>
                    <Button size="sm" variant="success" className="gap-1.5" onClick={submitFinal} disabled={submittingSub}>
                      {submittingSub ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Turn In
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : null}

          {/* Show submission content if it exists (for non-submitter viewers) */}
          {submissions.filter(s => s.status !== 'DRAFT').length > 0 && !canSubmit && (
            <Card className="card-premium card-premium-accent-success p-5">
              <SectionLabel className="mb-3 flex items-center gap-2"><Send className="h-3.5 w-3.5 text-primary" /> Latest Submission</SectionLabel>
              <SubmissionContent submission={submissions.find(s => s.status !== 'DRAFT') || submissions[0]} onDownloadFile={downloadFile} />
            </Card>
          )}

          {/* Submission Version History */}
          {submissions.length > 0 && (
            <Card className="card-premium p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionLabel className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Submission History</SectionLabel>
                <span className="text-[10px] text-muted-foreground tabular-nums">{submissions.length} version{submissions.length > 1 ? 's' : ''}</span>
              </div>
              <Timeline
                items={submissions.map((s: any) => {
                  const dot: 'default' | 'done' | 'now' =
                    s.status === 'APPROVED' ? 'done' :
                    s.status === 'CHANGES_REQUESTED' ? 'now' :
                    s.status === 'REJECTED' ? 'now' :
                    s.status === 'DRAFT' ? 'default' : 'done'
                  return {
                    dot,
                    title: `Version ${s.version} · ${s.status.replace(/_/g, ' ').toLowerCase()}`,
                    meta: s.submittedAt ? fmtDate(s.submittedAt, 'd MMM · h:mm a') : undefined,
                    body: (
                      <div className="space-y-1.5">
                        {s.managerScore != null && (
                          <Pill tone="emerald" icon={Award}>Score {s.managerScore}</Pill>
                        )}
                        {s.submissionNote && <p className="line-clamp-2">{s.submissionNote}</p>}
                        <SubmissionContent submission={s} onDownloadFile={downloadFile} compact />
                        {s.managerFeedback && <p className="text-emerald-700 dark:text-emerald-400 italic">Feedback: {s.managerFeedback}</p>}
                      </div>
                    ),
                  }
                })}
              />
            </Card>
          )}

          {/* AI Evaluation */}
          {(task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW' || task.status === 'APPROVED' || task.status === 'COMPLETED') && (
            <Card className="p-5 border-violet-500/20 shadow-card bg-gradient-to-br from-violet-500/[0.05] via-transparent to-blue-500/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <SectionLabel className="flex items-center gap-2"><Bot className="h-3.5 w-3.5 text-violet-600" /> AI Task Evaluation</SectionLabel>
                {canEvaluate && task.status === 'SUBMITTED' && (
                  <Button size="sm" variant="ai" onClick={runAIEval} disabled={aiLoading} className="gap-1.5 h-7">
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {task.aiScore !== null && task.aiScore !== undefined ? 'Re-run' : 'Run'} AI Review
                  </Button>
                )}
              </div>
              {task.aiScore !== null && task.aiScore !== undefined ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-5">
                    <div className="relative h-20 w-20 shrink-0">
                      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${task.aiScore}, 100`} strokeLinecap="round" className="text-violet-600" />
                      </svg>
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <p className="text-[22px] font-bold leading-none tabular-nums">{task.aiScore}</p>
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wide mt-0.5">AI</p>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold">Preliminary AI Score</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Initial assessment by AI. Manager makes the final decision.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <ProgressBar value={task.aiScore} max={100} tone="violet" className="flex-1 max-w-32" />
                        <span className="text-[10px] text-muted-foreground tabular-nums">/100</span>
                      </div>
                    </div>
                  </div>
                  {task.aiFeedback && (
                    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                      <SectionLabel className="mb-1.5">AI Feedback</SectionLabel>
                      <pre className="whitespace-pre-wrap font-sans bg-transparent p-0 m-0 text-[12px] text-foreground/80 leading-relaxed">{task.aiFeedback}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 rounded-md bg-muted/20 border border-dashed border-border/60">
                  <div className="h-12 w-12 rounded-2xl icon-tile-violet mx-auto mb-3 grid place-items-center">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="text-[12px] text-muted-foreground max-w-xs mx-auto leading-relaxed">AI evaluation will analyze the submission against deliverables & criteria.</p>
                </div>
              )}
            </Card>
          )}

          {/* Manager review — APPROVE / CHANGES REQUESTED / REJECT */}
          {canReview && (task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW') && (
            <Card className="p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.07] via-transparent to-teal-500/[0.05] shadow-card">
              <SectionLabel className="mb-3 flex items-center gap-2"><Award className="h-3.5 w-3.5 text-emerald-600" /> Manager Review</SectionLabel>
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Your Score</Label>
                    <span className="text-[20px] font-bold text-emerald-600 tabular-nums leading-none">{managerScore}</span>
                  </div>
                  <input type="range" min={0} max={100} value={managerScore} onChange={(e) => setManagerScore(parseInt(e.target.value))} className="w-full accent-emerald-600" />
                </div>
                <Textarea value={managerFeedback} onChange={(e) => setManagerFeedback(e.target.value)} placeholder="Your feedback to the employee…" rows={3} />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => act('APPROVE', { managerScore, managerFeedback })} disabled={acting} variant="success" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                  <Button onClick={() => setShowChangesDialog(true)} disabled={acting} variant="outline" className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"><RefreshCw className="h-4 w-4" /> Request Changes</Button>
                  <Button onClick={() => act('REJECT', { managerFeedback })} disabled={acting} variant="destructive" className="gap-2"><XCircle className="h-4 w-4" /> Reject</Button>
                  <Button onClick={() => act('COMPLETE', { managerScore, managerFeedback })} disabled={acting} variant="outline" className="gap-2"><Star className="h-4 w-4" /> Complete</Button>
                </div>
              </div>

              {showChangesDialog && (
                <div className="mt-4 sheet-premium rounded-2xl p-5 space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2">
                    <StatusDot tone="warning" />
                    <p className="text-[13px] font-semibold flex items-center gap-2"><RefreshCw className="h-4 w-4 text-amber-600" /> Request Changes</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">The assignee will be notified and can submit a new version. The current version remains in history.</p>
                  <Textarea value={managerFeedback} onChange={(e) => setManagerFeedback(e.target.value)} placeholder="What needs to change?" rows={3} className="focus-glow" />
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setShowChangesDialog(false)} className="btn-glass">Cancel</Button>
                    <Button size="sm" variant="warm" className="gap-1.5" onClick={() => act('CHANGES_REQUESTED', { managerScore, managerFeedback })} disabled={acting}>
                      {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Request Changes
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {task.managerScore !== null && task.managerScore !== undefined && (
            <Card className="card-premium card-premium-accent-success p-5">
              <SectionLabel className="mb-3 flex items-center gap-2"><Award className="h-3.5 w-3.5 text-emerald-600" /> Manager Decision</SectionLabel>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 grid place-items-center shrink-0">
                  <span className="text-xl font-bold tabular-nums">{task.managerScore}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">Final Score</p>
                  <p className="text-[11px] text-muted-foreground">By {currentEmployee?.name}</p>
                </div>
              </div>
              {task.managerFeedback && <div className="mt-3 pt-3 border-t border-border/60"><SectionLabel className="mb-1.5">Feedback</SectionLabel><p className="text-[13px] text-foreground/80 leading-relaxed">{task.managerFeedback}</p></div>}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {task.assignee && (
            <Card className="card-premium p-4">
              <SectionLabel className="mb-2.5 flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> Assigned To</SectionLabel>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-full ring-2 ring-border"><AvatarImage src={task.assignee.photoUrl} /><AvatarFallback className="text-[11px]">{initials(task.assignee.name)}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="text-[13px] font-medium truncate">{task.assignee.name}</p><p className="text-[11px] text-muted-foreground truncate">{task.assignee.designation}</p></div>
              </div>
            </Card>
          )}
          <Card className="card-premium p-4">
            <SectionLabel className="mb-3 flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Task Lifecycle</SectionLabel>
            <Timeline
              items={COLUMNS.map((c, i) => {
                const currentIdx = COLUMNS.findIndex((x) => x.id === task.status)
                const reached = currentIdx >= i
                const isNow = i === currentIdx
                return {
                  dot: isNow ? 'now' as const : reached ? 'done' as const : 'default' as const,
                  title: c.label,
                  meta: isNow ? 'current' : undefined,
                }
              })}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SubmissionContent — renders a submission's fields, files, links
// ============================================================
function SubmissionContent({ submission, onDownloadFile, compact }: { submission: any; onDownloadFile: (path: string) => void; compact?: boolean }) {
  if (!submission) return null
  const fields: any[] = Array.isArray(submission.fields) ? submission.fields : []
  const files: any[] = Array.isArray(submission.files) ? submission.files : []
  const links: any[] = Array.isArray(submission.links) ? submission.links : []

  // Legacy: files/links as strings (comma-separated)
  const legacyFiles = typeof submission.files === 'string' ? submission.files.split(',').filter(Boolean) : []
  const legacyLinks = typeof submission.links === 'string' ? submission.links.split(',').filter(Boolean) : []

  if (fields.length === 0 && legacyFiles.length === 0 && legacyLinks.length === 0 && !submission.submissionNote) return null

  return (
    <div className={`mt-2 space-y-2 ${compact ? '' : 'rounded-lg border border-border bg-muted/20 p-3'}`}>
      {fields.map((f: any, i: number) => (
        <div key={i} className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.requirementId}</p>
          {f.value && <p className="text-[12px] leading-relaxed">{f.value.length > 200 ? f.value.slice(0, 200) + '…' : f.value}</p>}
          {Array.isArray(f.files) && f.files.length > 0 && (
            <div className="space-y-1">
              {f.files.map((file: any, j: number) => (
                <button
                  key={j}
                  onClick={() => onDownloadFile(file.path)}
                  className="flex items-center gap-2 text-[11px] text-primary hover:underline"
                >
                  <FileIcon className="h-3 w-3" /> {file.name} <span className="text-muted-foreground tabular-nums">({(file.size / 1024).toFixed(1)}KB)</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file: any, i: number) => (
            <button
              key={i}
              onClick={() => onDownloadFile(file.path)}
              className="flex items-center gap-1.5 text-[11px] rounded-md border border-border bg-muted/30 px-2 py-1 text-primary hover:underline transition-colors"
            >
              <FileIcon className="h-3 w-3" /> {file.name}
            </button>
          ))}
        </div>
      )}
      {legacyFiles.length > 0 && (
        <p className="text-[11px] text-muted-foreground">📎 {legacyFiles.length} files: {legacyFiles.join(', ')}</p>
      )}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l: any, i: number) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
              <LinkIcon className="h-3 w-3" /> {l.label || l.url}
            </a>
          ))}
        </div>
      )}
      {legacyLinks.length > 0 && (
        <div className="space-y-1">
          {legacyLinks.map((url: string, i: number) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
              <LinkIcon className="h-3 w-3" /> {url}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
