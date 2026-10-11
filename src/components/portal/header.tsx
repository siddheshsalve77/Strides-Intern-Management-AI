'use client'

import { useState, useEffect } from 'react'
import { useApp, roleLabel } from '@/lib/store'
import { viewTitle } from '@/lib/nav'
import { useNotifications, useAuthSession } from '@/lib/use-auth-session'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { initials, fmtRelative } from '@/lib/format'
import type { NotificationT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'
import {
  Menu, Search, Bell, Sun, Moon, LogOut, User, Settings, ChevronDown,
  Command,
} from 'lucide-react'

export function Header() {
  const { currentEmployee, view, setSidebarOpen, setView, logout } = useApp()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { notifications: notifs, loading: loadingNotifs } = useNotifications()
  const { fullLogout } = useAuthSession()

  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t) }, [])

  async function markAllRead() {
    if (!currentEmployee) return
    await authedFetch('/api/notifications', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: currentEmployee.id, action: 'READ_ALL' }),
    })
    toast.success('All notifications marked as read')
  }

  const unread = notifs.filter((n) => !n.read).length

  if (!currentEmployee) return null

  return (
    <header className="h-14 glass-bar flex items-center gap-2.5 px-4 lg:px-6 shrink-0 z-30 relative">
      <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 press-tactile" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu className="h-[18px] w-[18px]" />
      </Button>

      <div className="flex flex-col min-w-0">
        <h1 className="text-[15px] font-semibold tracking-tight leading-none truncate">
          {viewTitle[view]}
        </h1>
        <p className="hidden sm:block text-[11px] text-muted-foreground mt-0.5 tabular-nums">
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* Command palette trigger — premium glass search bar */}
      <button
        onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }); window.dispatchEvent(e) }}
        className="ml-auto hidden md:flex items-center gap-2 rounded-lg px-2.5 h-8 text-[12px] text-muted-foreground hover:text-foreground transition-all duration-200 w-full max-w-[260px] press-tactile group focus-glow"
        style={{ background: 'oklch(1 0 0 / 0.7)', backdropFilter: 'blur(8px)', border: '1px solid oklch(0.9 0.004 75 / 0.7)' }}
        aria-label="Search (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
        <span className="flex-1 text-left">Search tasks, people, pages…</span>
        <kbd className="kbd">
          <Command className="h-2 w-2" />K
        </kbd>
      </button>

      <div className="ml-auto md:ml-0 flex items-center gap-1">
        {mounted && (
          <Button variant="ghost" size="icon" className="h-9 w-9 press-tactile hover:bg-accent/60" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-[16px] w-[16px]" /> : <Moon className="h-[16px] w-[16px]" />}
          </Button>
        )}

        {/* Notifications — premium pill badge */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative press-tactile hover:bg-accent/60" title="Notifications" aria-label="Notifications">
              <Bell className="h-[16px] w-[16px]" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-[15px] min-w-[15px] px-1 rounded-full text-[9px] font-bold grid place-items-center tabular-nums text-white press-tactile" style={{ background: 'var(--gradient-warm)', boxShadow: '0 0 0 2px oklch(1 0 0 / 0.9), 0 2px 6px oklch(0.65 0.16 25 / 0.4)' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 glass-panel animate-slide-up" align="end">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
              <p className="text-[13px] font-semibold">Notifications</p>
              {unread > 0 && <button onClick={markAllRead} className="text-[11px] text-primary hover:underline font-medium">Mark all read</button>}
            </div>
            <ScrollArea className="h-80">
              {loadingNotifs ? (
                <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full skeleton-premium border-0" />)}</div>
              ) : notifs.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-12 w-12 mx-auto mb-3 rounded-2xl icon-tile icon-tile-violet grid place-items-center">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-[13px] font-medium">All caught up</p>
                  <p className="text-[11px] text-muted-foreground mt-1">No new notifications right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifs.slice(0, 12).map((n) => (
                    <button key={n.id} onClick={() => setView('notifications')} className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent/40 transition-colors press-tactile">
                      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read ? 'bg-muted-foreground/30' : ''}`} style={!n.read ? { background: 'var(--gradient-warm)', boxShadow: '0 0 6px oklch(0.65 0.16 25 / 0.5)' } : {}} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium leading-snug truncate">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground/60 mt-0.5 tabular-nums">{fmtRelative(n.createdAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="border-t border-border/60 p-2">
              <button onClick={() => setView('notifications')} className="w-full text-center text-[11px] font-medium text-primary hover:underline py-1.5 rounded-md hover:bg-accent/40 transition-colors">
                View all notifications
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu — premium avatar with gradient ring on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-0.5 pr-2 py-0.5 hover:bg-accent/50 transition-all duration-200 press-tactile group" aria-label="Account menu">
              <Avatar className="h-7 w-7 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                <AvatarImage src={currentEmployee.photoUrl} alt={currentEmployee.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">{initials(currentEmployee.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-[11px] font-medium max-w-[100px] truncate">{currentEmployee.name}</span>
                <span className="text-[9px] text-muted-foreground">{roleLabel[currentEmployee.role]}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block transition-transform group-hover:translate-y-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-panel animate-slide-up p-1">
            <DropdownMenuLabel className="flex flex-col gap-1 py-2 px-2 mb-1 rounded-md" style={{ background: 'var(--gradient-primary-soft)' }}>
              <span className="text-[13px] font-semibold text-foreground">{currentEmployee.name}</span>
              <span className="text-[11px] font-normal text-muted-foreground">{currentEmployee.email}</span>
              <Badge variant="outline" className="mt-1 w-fit text-[10px]">{roleLabel[currentEmployee.role]}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setView('profile')} className="text-[12px] rounded-md press-tactile">
                <User className="h-3.5 w-3.5 mr-2" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('settings')} className="text-[12px] rounded-md press-tactile">
                <Settings className="h-3.5 w-3.5 mr-2" /> Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={fullLogout} className="text-[12px] text-rose-600 focus:text-rose-700 focus:bg-rose-500/10 rounded-md press-tactile">
              <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
