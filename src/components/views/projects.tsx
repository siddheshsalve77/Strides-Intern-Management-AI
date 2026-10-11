'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { PageHeader, EmptyState, MetricStrip, RowSkeleton, SectionCard, SectionLabel, StatusDot } from '@/components/portal/ui-helpers'
import { cn } from '@/lib/utils'
import { fmtDate, taskColor, taskLabel, priorityColor, initials } from '@/lib/format'
import { FolderKanban, ArrowLeft, Calendar, Plus } from 'lucide-react'
import type { ProjectT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const projectStatusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'info',
  PLANNED: 'neutral',
  CANCELLED: 'danger',
}

export function ProjectsView() {
  const { currentEmployee, selectedProjectId, setSelectedProjectId } = useApp()
  const [projects, setProjects] = useState<ProjectT[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!currentEmployee) return
    try {
      const res = await authedFetch(`/api/projects?employeeId=${currentEmployee.id}`).then((r) => r.json())
      setProjects(Array.isArray(res) ? res : [])
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [currentEmployee])

  if (selectedProjectId) return <ProjectDetail id={selectedProjectId} onBack={() => setSelectedProjectId(null)} />

  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Projects you're part of"
        actions={<Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> New Project</Button>}
      />

      <MetricStrip
        metrics={[
          { label: 'Active', value: projects.filter((p) => p.status === 'ACTIVE').length, sub: 'in progress', tone: 'success' },
          { label: 'On Hold', value: projects.filter((p) => p.status === 'ON_HOLD').length, sub: 'paused', tone: 'warning' },
          { label: 'Completed', value: projects.filter((p) => p.status === 'COMPLETED').length, sub: 'done', tone: 'info' },
          { label: 'Avg Progress', value: `${avgProgress}%`, sub: 'across all', tone: 'info' },
        ]}
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-card shadow-card p-2"><RowSkeleton count={5} /></div>
      ) : projects.length === 0 ? (
        <Card className="shadow-card"><EmptyState icon={FolderKanban} title="No projects" description="Projects you join will appear here." /></Card>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <div className="divide-y divide-border">
            {projects.map((p, i) => {
              const tasks = p.tasks || []
              const done = tasks.filter((t) => ['COMPLETED', 'APPROVED'].includes(t.status)).length
              const inProg = tasks.filter((t) => t.status === 'IN_PROGRESS').length
              const pending = tasks.filter((t) => ['CREATED', 'ASSIGNED', 'ACCEPTED'].includes(t.status)).length
              const tone = projectStatusTone[p.status] || 'neutral'
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className="w-full text-left p-4 hover:bg-accent transition-colors duration-200 animate-rise"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-start gap-3">
                    <StatusDot tone={tone} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-semibold text-[13px] leading-tight">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] border-0 shrink-0', priorityColor(p.priority))}>{p.priority}</Badge>
                      </div>
                      {/* Progress + counts */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-3 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center justify-between text-[10px] mb-1.5">
                            <SectionLabel>Progress</SectionLabel>
                            <span className="font-semibold tabular-nums">{p.progress}%</span>
                          </div>
                          <Progress value={p.progress} className="h-1" />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums shrink-0">
                          <span><span className="font-semibold text-emerald-600">{done}</span> done</span>
                          <span><span className="font-semibold text-sky-600">{inProg}</span> active</span>
                          <span><span className="font-semibold text-amber-600">{pending}</span> todo</span>
                        </div>
                      </div>
                      {/* Team + status */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex -space-x-2">
                          {(p.members || []).slice(0, 5).map((m) => (
                            <Avatar key={m.id} className="h-5 w-5 border-2 border-background"><AvatarImage src={m.employee.photoUrl} /><AvatarFallback className="text-[8px]">{initials(m.employee.name)}</AvatarFallback></Avatar>
                          ))}
                          {(p.members || []).length > 5 && <div className="h-5 w-5 rounded-full bg-muted border-2 border-background grid place-items-center text-[8px] font-medium">+{(p.members || []).length - 5}</div>}
                        </div>
                        <Badge variant="outline" className="text-[10px] border-0">{p.status.replace(/_/g, ' ').toLowerCase()}</Badge>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { setView } = useApp()
  const [project, setProject] = useState<ProjectT | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authedFetch(`/api/projects/${id}`).then((r) => r.json()).then((p) => { setProject(p); setLoading(false) })
  }, [id])

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
  if (!project) return <EmptyState icon={FolderKanban} title="Project not found" action={<Button onClick={onBack} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>} />

  const tasks = project.tasks || []
  const done = tasks.filter((t) => ['COMPLETED', 'APPROVED'].includes(t.status)).length
  const inProg = tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const pending = tasks.filter((t) => ['CREATED', 'ASSIGNED', 'ACCEPTED'].includes(t.status)).length

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back to projects</Button>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground p-6 shadow-card">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-white/15 text-white border-white/20 text-[10px]">{project.status.replace(/_/g, ' ')}</Badge>
              <Badge variant="secondary" className="bg-white/15 text-white border-white/20 text-[10px]">{project.priority}</Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
            <p className="text-[12px] text-primary-foreground/80 mt-1 max-w-2xl text-pretty">{project.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-bold tabular-nums">{project.progress}%</p>
            <p className="text-[10px] text-primary-foreground/70">complete</p>
          </div>
        </div>
      </Card>

      <MetricStrip
        metrics={[
          { label: 'Team', value: project.members?.length || 0, sub: 'members', tone: 'info' },
          { label: 'Done', value: done, sub: 'tasks', tone: 'success' },
          { label: 'In Progress', value: inProg, sub: 'active', tone: 'warning' },
          { label: 'Pending', value: pending, sub: 'todo' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard className="lg:col-span-2 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Project Tasks</SectionLabel>
            <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => setView('tasks')}>View all <ArrowLeft className="h-3 w-3 ml-1 rotate-180" /></Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No tasks yet</p>
          ) : (
            <div className="space-y-1">
              {tasks.slice(0, 8).map((t) => (
                <div key={t.id} className="compact-row cursor-pointer" onClick={() => setView('tasks')}>
                  <StatusDot tone={t.status === 'IN_PROGRESS' ? 'info' : t.status === 'COMPLETED' || t.status === 'APPROVED' ? 'success' : 'neutral'} />
                  <div className="min-w-0 flex-1"><p className="text-[12px] font-medium truncate">{t.title}</p><p className="text-[10px] text-muted-foreground truncate">{t.assignee?.name}</p></div>
                  <Badge variant="outline" className={cn('text-[10px] border-0', taskColor(t.status))}>{taskLabel(t.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard className="shadow-card">
          <SectionLabel>Team</SectionLabel>
          <div className="space-y-1 mt-2">
            {(project.members || []).map((m) => (
              <div key={m.id} className="compact-row">
                <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={m.employee.photoUrl} /><AvatarFallback className="text-[9px]">{initials(m.employee.name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="text-[12px] font-medium truncate">{m.employee.name}</p><p className="text-[10px] text-muted-foreground truncate">{m.employee.designation}</p></div>
                <Badge variant="outline" className="text-[10px] border-0">{m.role}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Started</span><span className="tabular-nums">{fmtDate(project.startDate)}</span></div>
            {project.endDate && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Due</span><span className="tabular-nums">{fmtDate(project.endDate)}</span></div>}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
