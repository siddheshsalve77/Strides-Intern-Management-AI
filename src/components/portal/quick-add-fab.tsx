'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Clock, CalendarDays, ListChecks, LifeBuoy, Sparkles, X } from 'lucide-react'
import type { ViewId } from '@/lib/types'

const quickActions: { label: string; desc: string; icon: any; view: ViewId; color: string }[] = [
  { label: 'Check In / Out', desc: 'Mark attendance', icon: Clock, view: 'attendance', color: 'bg-emerald-500/10 text-emerald-600' },
  { label: 'Apply Leave', desc: 'Request time off', icon: CalendarDays, view: 'leave', color: 'bg-amber-500/10 text-amber-600' },
  { label: 'New Task', desc: 'Create a task', icon: ListChecks, view: 'tasks', color: 'bg-sky-500/10 text-sky-600' },
  { label: 'Raise Request', desc: 'HR/IT ticket', icon: LifeBuoy, view: 'requests', color: 'bg-violet-500/10 text-violet-600' },
  { label: 'Ask AI', desc: 'Get AI help', icon: Sparkles, view: 'ai-assistant', color: 'bg-rose-500/10 text-rose-600' },
]

export function QuickAddFAB() {
  const { setView } = useApp()
  const [open, setOpen] = useState(false)

  function go(v: ViewId) {
    setView(v)
    setOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-items-center hover:shadow-xl hover:shadow-primary/40 transition-shadow"
            aria-label="Quick actions"
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <X className="h-6 w-6" />
                </motion.span>
              ) : (
                <motion.span key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                  <Plus className="h-6 w-6" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-64 p-2 mb-2" sideOffset={8}>
          <div className="px-2 py-1.5 mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</p>
          </div>
          <div className="space-y-0.5">
            {quickActions.map((a, i) => {
              const Icon = a.icon
              return (
                <motion.button
                  key={a.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => go(a.view)}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent transition-colors group"
                >
                  <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${a.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
