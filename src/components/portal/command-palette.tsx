'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp, roleLabel } from '@/lib/store'
import { navForRole, viewTitle } from '@/lib/nav'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import type { ViewId, EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'
import {
  Search, CornerDownLeft, ArrowUp, ArrowDown, Command, Bot, User,
  ListChecks, Megaphone,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  icon: any
  kind: 'page' | 'action' | 'person'
  view?: ViewId
  action?: () => void
  photoUrl?: string
}

export function CommandPalette() {
  const { currentEmployee, setView } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [people, setPeople] = useState<EmployeeT[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function openPalette() {
    setOpen(true)
    setQuery('')
    setSelected(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  function closePalette() { setOpen(false) }
  function togglePalette() { if (open) closePalette(); else openPalette() }

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        togglePalette()
      }
      if (e.key === 'Escape') closePalette()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Load people, tasks, announcements for search when palette opens
  useEffect(() => {
    if (open && people.length === 0) {
      authedFetch('/api/directory').then((r) => r.json()).then((d) => setPeople(Array.isArray(d) ? d : [])).catch(() => setPeople([]))
    }
    if (open && tasks.length === 0 && currentEmployee) {
      authedFetch(`/api/tasks?assigneeId=${currentEmployee.id}`).then((r) => r.json()).then((d) => setTasks(Array.isArray(d) ? d : [])).catch(() => setTasks([]))
    }
    if (open && announcements.length === 0) {
      authedFetch('/api/announcements').then((r) => r.json()).then((d) => setAnnouncements(Array.isArray(d) ? d : [])).catch(() => setAnnouncements([]))
    }
  }, [open, people.length, tasks.length, announcements.length, currentEmployee])

  const items: CommandItem[] = useMemo(() => {
    if (!currentEmployee) return []
    const list: CommandItem[] = []
    // Pages
    const sections = navForRole(currentEmployee.role)
    sections.forEach((s) => {
      s.items.forEach((item) => {
        list.push({
          id: `page-${item.id}`,
          label: item.label,
          sublabel: s.title,
          icon: item.icon,
          kind: 'page',
          view: item.id,
        })
      })
    })
    // Quick actions
    list.push({ id: 'act-checkin', label: 'Check In / Check Out', sublabel: 'Action', icon: Bot, kind: 'action', view: 'attendance' })
    list.push({ id: 'act-leave', label: 'Apply for Leave', sublabel: 'Action', icon: Bot, kind: 'action', view: 'leave' })
    list.push({ id: 'act-task', label: 'Create New Task', sublabel: 'Action', icon: Bot, kind: 'action', view: 'tasks' })
    list.push({ id: 'act-request', label: 'Raise Service Request', sublabel: 'Action', icon: Bot, kind: 'action', view: 'requests' })
    list.push({ id: 'act-ai', label: 'Ask AI Assistant', sublabel: 'Action', icon: Bot, kind: 'action', view: 'ai-assistant' })
    // People
    people.forEach((p) => {
      list.push({
        id: `person-${p.id}`,
        label: p.name,
        sublabel: `${p.designation} · ${p.department}`,
        icon: User,
        kind: 'person',
        view: 'directory',
        photoUrl: p.photoUrl,
      })
    })
    // Tasks
    tasks.forEach((t) => {
      list.push({
        id: `task-${t.id}`,
        label: t.title,
        sublabel: `Task · ${t.status.replace(/_/g, ' ').toLowerCase()}`,
        icon: ListChecks,
        kind: 'action',
        view: 'tasks',
      })
    })
    // Announcements
    announcements.forEach((a) => {
      list.push({
        id: `ann-${a.id}`,
        label: a.title,
        sublabel: `Announcement · ${a.category}`,
        icon: Megaphone,
        kind: 'action',
        view: 'announcements',
      })
    })
    return list
  }, [currentEmployee, people, tasks, announcements])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return items.slice(0, 8)
    return items.filter((i) =>
      i.label.toLowerCase().includes(q) ||
      (i.sublabel?.toLowerCase().includes(q) || false)
    ).slice(0, 12)
  }, [items, query])

  function select(item: CommandItem) {
    if (item.view) setView(item.view)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); if (filtered[selected]) select(filtered[selected]) }
  }

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setSelected(0) // reset selection when query changes
  }

  if (!currentEmployee) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-xl gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={onQueryChange}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions, people…"
            className="border-0 p-0 h-auto focus-visible:ring-0 text-base shadow-none"
          />
          <Badge variant="outline" className="text-[10px] gap-1 shrink-0"><Command className="h-2.5 w-2.5" />K</Badge>
        </div>

        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />
              No results for "{query}"
            </div>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon
              const active = i === selected
              return (
                <button
                  key={item.id}
                  onClick={() => select(item)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  {item.kind === 'person' && item.photoUrl ? (
                    <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={item.photoUrl} /><AvatarFallback className="text-[10px]">{initials(item.label)}</AvatarFallback></Avatar>
                  ) : (
                    <div className={`h-7 w-7 rounded-lg grid place-items-center shrink-0 ${item.kind === 'person' ? 'bg-primary/10 text-primary' : item.kind === 'action' ? 'bg-violet-500/10 text-violet-600' : 'bg-muted'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.sublabel && <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>}
                  </div>
                  {item.kind === 'person' && <Badge variant="outline" className="text-[10px]">Directory</Badge>}
                  {active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </button>
              )
            })
          )}
        </div>

        <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
            <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> select</span>
            <span className="flex items-center gap-1">esc close</span>
          </div>
          <span>STRIDES ONE Command</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
