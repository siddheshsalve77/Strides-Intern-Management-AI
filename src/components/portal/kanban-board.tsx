'use client'

import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fmtDate, taskColor, taskLabel, priorityColor, daysUntil, initials } from '@/lib/format'
import type { TaskT } from '@/lib/types'
import { Calendar, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export const COLUMNS = [
  { id: 'CREATED', label: 'To Do', color: 'bg-zinc-400' },
  { id: 'ASSIGNED', label: 'Assigned', color: 'bg-sky-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'SUBMITTED', label: 'Submitted', color: 'bg-amber-500' },
  { id: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-violet-500' },
  { id: 'APPROVED', label: 'Approved', color: 'bg-teal-500' },
  { id: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' },
]

interface KanbanBoardProps {
  tasks: TaskT[]
  onTaskClick: (id: string) => void
  onStatusChange: (taskId: string, newStatus: string) => void
}

export function KanbanBoard({ tasks, onTaskClick, onStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragOver(e: DragOverEvent) {
    // nothing needed; droppable zones handle it
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const taskId = active.id as string
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    // over could be a column id or another task id
    const overId = over.id as string
    let newStatus: string | null = null
    if (COLUMNS.some((c) => c.id === overId)) {
      newStatus = overId
    } else {
      // dropped over a task — use that task's column
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) newStatus = overTask.status
    }
    if (newStatus && newStatus !== task.status) {
      onStatusChange(taskId, newStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <KanbanColumn key={col.id} column={col} tasks={colTasks} onTaskClick={onTaskClick} />
          )
        })}
      </div>
      <DragOverlay>
        {activeTask ? <DraggableTaskCard task={activeTask} dragging onClick={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({ column, tasks, onTaskClick }: { column: { id: string; label: string; color: string }; tasks: TaskT[]; onTaskClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <div className="flex flex-col min-w-[260px]">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`h-2 w-2 rounded-full ${column.color}`} />
        <p className="text-sm font-semibold">{column.label}</p>
        <Badge variant="secondary" className="text-[10px] h-5">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn('flex-1 space-y-2 rounded-lg p-1.5 min-h-[100px] transition-colors', isOver ? 'bg-primary/5 ring-2 ring-primary/30' : 'bg-muted/30')}
      >
        {tasks.map((t) => (
          <DraggableTaskCard key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground/50 border-2 border-dashed border-muted-foreground/15 rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableTaskCard({ task, onClick, dragging }: { task: TaskT; onClick: () => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const d = task.deadline ? daysUntil(task.deadline) : null
  const overdue = d !== null && d < 0 && !['COMPLETED', 'APPROVED'].includes(task.status)
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'w-full text-left rounded-lg border bg-card p-3 transition-all group',
        dragging ? 'shadow-xl border-primary/40 opacity-90' : 'border-border hover:shadow-md hover:border-primary/30',
        isDragging && !dragging && 'opacity-30'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <button onClick={onClick} className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">{task.title}</p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={`text-[10px] ${priorityColor(task.priority)}`}>{task.priority}</Badge>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none p-0.5"
            aria-label="Drag task"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button onClick={onClick} className="block w-full text-left">
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
              <Badge variant="outline" className={cn('text-[10px]', overdue ? 'bg-rose-500/15 text-rose-600 border-rose-500/20' : (d !== null && d <= 3) ? 'bg-amber-500/15 text-amber-600 border-amber-500/20' : '')}>
                <Calendar className="h-2.5 w-2.5 mr-1" />{overdue ? 'Overdue' : d === 0 ? 'Today' : d !== null ? `${d}d` : ''}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px]', taskColor(task.status))}>{taskLabel(task.status)}</Badge>
          </div>
        </div>
      </button>
    </div>
  )
}
