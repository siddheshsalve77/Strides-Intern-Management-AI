'use client'

import { useApp, roleLabel } from '@/lib/store'
import { navForRole } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle, SheetHeader } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { initials } from '@/lib/format'

// ============================================================
// NAV LIST — shared between expanded sidebar, collapsed rail and mobile sheet
// ============================================================
function NavList({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { currentEmployee, view, setView } = useApp()
  if (!currentEmployee) return null
  const sections = navForRole(currentEmployee.role)

  if (collapsed) {
    return (
      <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden scrollbar-thin py-3" aria-label="Primary">
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mx-auto mb-1.5 h-px w-6 bg-sidebar-border/60" aria-hidden />
              <div className="space-y-0.5 flex flex-col items-center">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = view === item.id
                  return (
                    <Tooltip key={item.id} delayDuration={150}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { setView(item.id); onNavigate?.() }}
                          aria-label={item.label}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group relative w-9 h-9 grid place-items-center rounded-lg transition-all duration-200 press-tactile',
                            active
                              ? 'nav-active'
                              : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/95'
                          )}
                        >
                          {active && <span className="nav-active-bar" aria-hidden />}
                          <Icon className={cn('h-[16px] w-[16px] transition-transform', active ? 'scale-105' : 'group-hover:scale-105')} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="text-[11px]">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav className="flex-1 px-3 overflow-y-auto overflow-x-hidden scrollbar-thin" aria-label="Primary">
      <div className="space-y-5 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-sidebar-foreground/40">
              {section.title}
            </p>
            <div className="space-y-px">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = view === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id); onNavigate?.() }}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative w-full flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-all duration-200 press-tactile',
                      active
                        ? 'nav-active'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/95'
                    )}
                  >
                    {active && <span className="nav-active-bar" aria-hidden />}
                    <Icon className={cn(
                      'h-[15px] w-[15px] shrink-0 transition-all',
                      active ? 'text-sidebar-foreground' : 'text-sidebar-foreground/45 group-hover:text-sidebar-foreground/75 group-hover:scale-105'
                    )} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        'text-[9px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
                        active
                          ? 'bg-sidebar-foreground/15 text-sidebar-foreground'
                          : 'bg-sidebar-primary/15 text-sidebar-primary/80'
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}

// ============================================================
// BRAND — full lockup when expanded, monogram when collapsed
// ============================================================
function BrandHeader({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn(
      'flex items-center h-14 border-b border-sidebar-border shrink-0 relative',
      collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'
    )}>
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, oklch(0.62 0.1 178 / 0.5), transparent)' }} aria-hidden />
      <div className="h-7 w-7 rounded-md grid place-items-center font-bold text-[13px] shadow-sm shrink-0 press-tactile" style={{ background: 'var(--gradient-primary)', color: 'oklch(0.99 0.005 178)' }}>
        S
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-semibold tracking-tight text-[13px] leading-none text-sidebar-foreground">STRIDES ONE</p>
          <p className="text-[9px] text-sidebar-foreground/45 mt-0.5 tracking-[0.12em] uppercase">Employee Experience</p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// WORKSPACE IDENTITY — signed-in user block at the bottom
// ============================================================
function WorkspaceIdentity({ collapsed = false }: { collapsed?: boolean }) {
  const { currentEmployee, setView } = useApp()
  if (!currentEmployee) return null

  if (collapsed) {
    return (
      <div className="px-2 pb-2 pt-1 border-t border-sidebar-border/60 mt-1">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setView('profile')}
              className="w-full grid place-items-center py-1 rounded-lg hover:bg-sidebar-accent/50 transition-colors press-tactile"
              aria-label="My Profile"
            >
              <Avatar className="h-8 w-8 ring-1 ring-sidebar-border/70">
                <AvatarImage src={currentEmployee.photoUrl} alt={currentEmployee.name} />
                <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-[10px] font-semibold">{initials(currentEmployee.name)}</AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-[11px]">
            {currentEmployee.name} · {roleLabel[currentEmployee.role]}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="mx-3 mb-2 p-2 rounded-lg border border-sidebar-border/60 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, oklch(0.62 0.1 178 / 0.1), oklch(0.58 0.17 290 / 0.06))' }}>
      <button onClick={() => setView('profile')} className="w-full flex items-center gap-2.5 text-left group press-tactile">
        <Avatar className="h-8 w-8 ring-1 ring-sidebar-border/70">
          <AvatarImage src={currentEmployee.photoUrl} alt={currentEmployee.name} />
          <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-[10px] font-semibold">{initials(currentEmployee.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-sidebar-foreground/95 truncate group-hover:text-sidebar-foreground transition-colors">{currentEmployee.name}</p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">{roleLabel[currentEmployee.role]}</p>
        </div>
      </button>
    </div>
  )
}

function AssistantCard({ collapsed = false }: { collapsed?: boolean }) {
  const { setView } = useApp()

  if (collapsed) {
    return (
      <div className="px-2 pb-2">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setView('ai-assistant')}
              className="w-full h-9 grid place-items-center rounded-lg transition-all duration-200 press-tactile relative overflow-hidden"
              style={{ background: 'var(--gradient-ai-soft)', border: '1px solid oklch(0.55 0.16 240 / 0.25)' }}
              aria-label="AI Assistant"
            >
              <Sparkles className="h-4 w-4 text-sidebar-primary" style={{ color: 'oklch(0.78 0.13 240)' }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-[11px]">AI Assistant · ⌘K</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="mx-3 mb-2">
      <button
        onClick={() => setView('ai-assistant')}
        className="w-full group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-200 press-tactile relative overflow-hidden"
        style={{ background: 'var(--gradient-ai-soft)', border: '1px solid oklch(0.55 0.16 240 / 0.22)' }}
      >
        <div className="h-7 w-7 rounded-md grid place-items-center shrink-0" style={{ background: 'var(--gradient-ai)', boxShadow: '0 1px 0 oklch(1 0 0 / 0.2) inset, 0 2px 6px oklch(0.55 0.16 240 / 0.3)' }}>
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold" style={{ color: 'oklch(0.84 0.13 240)' }}>AI Assistant</p>
          <p className="text-[10px] text-sidebar-foreground/50">Ask anything · ⌘K</p>
        </div>
      </button>
    </div>
  )
}

// ============================================================
// DESKTOP SIDEBAR — expanded (240px) / collapsed rail (60px)
// Collapse state lives in the zustand store (persisted, lint-safe)
// ============================================================
export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp()
  const collapsed = sidebarCollapsed

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border h-full overflow-y-auto overflow-x-hidden scrollbar-thin transition-[width] duration-200 ease-out',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      <BrandHeader collapsed={collapsed} />
      <NavList collapsed={collapsed} />
      <AssistantCard collapsed={collapsed} />
      <WorkspaceIdentity collapsed={collapsed} />
      <div className={cn('shrink-0 border-t border-sidebar-border/60', collapsed ? 'px-2 py-2 flex justify-center' : 'px-3 py-2')}>
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSidebarCollapsed(!collapsed)}
              className={cn(
                'flex items-center gap-2 rounded-md text-sidebar-foreground/45 hover:text-sidebar-foreground/85 hover:bg-sidebar-accent/50 transition-colors',
                collapsed ? 'h-8 w-8 justify-center' : 'w-full px-2.5 py-1.5 text-[11px] font-medium'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-3.5 w-3.5" /><span>Collapse</span></>}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right" sideOffset={8} className="text-[11px]">Expand sidebar</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  )
}

// ============================================================
// MOBILE SIDEBAR — full nav in a sheet
// ============================================================
export function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp()
  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
        <SheetHeader className="h-14 border-b border-sidebar-border flex flex-row items-center justify-between pr-4">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sidebar-primary to-primary text-primary-foreground grid place-items-center font-bold text-[13px]">
              S
            </div>
            <span className="text-sidebar-foreground text-[13px]">STRIDES ONE</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
          <NavList onNavigate={() => setSidebarOpen(false)} />
          <WorkspaceIdentity />
          <AssistantCard />
        </div>
      </SheetContent>
    </Sheet>
  )
}
