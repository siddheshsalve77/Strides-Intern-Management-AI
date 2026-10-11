'use client'

import { useApp } from '@/lib/store'
import { Sidebar, MobileSidebar } from './sidebar'
import { Header } from './header'
import { Footer } from './footer'
import { CommandPalette } from './command-palette'
import { QuickAddFAB } from './quick-add-fab'
import { motion } from 'framer-motion'
import { DashboardView } from '@/components/views/dashboard'
import { AttendanceView } from '@/components/views/attendance'
import { LeaveView } from '@/components/views/leave'
import { CalendarView } from '@/components/views/calendar'
import { TasksView } from '@/components/views/tasks'
import { ProjectsView } from '@/components/views/projects'
import { PerformanceView } from '@/components/views/performance'
import { GoalsView } from '@/components/views/goals'
import { LearningView } from '@/components/views/learning'
import { DocumentsView } from '@/components/views/documents'
import { RequestsView } from '@/components/views/requests'
import { ExpensesView } from '@/components/views/expenses'
import { AssetsView } from '@/components/views/assets'
import { DirectoryView } from '@/components/views/directory'
import { AnnouncementsView } from '@/components/views/announcements'
import { NotificationsView } from '@/components/views/notifications'
import { AIAssistantView } from '@/components/views/ai-assistant'
import { ProfileView } from '@/components/views/profile'
import { AuditView } from '@/components/views/audit'
import { TeamView } from '@/components/views/team'
import { EmployeesView } from '@/components/views/employees'
import { DepartmentsView } from '@/components/views/departments'
import { OnboardingView } from '@/components/views/onboarding'
import { TravelView } from '@/components/views/travel'
import { OffboardingView } from '@/components/views/offboarding'
import { MeetingsView } from '@/components/views/meetings'
import { DigestView } from '@/components/views/digest'
import { SettingsView } from '@/components/views/settings'
import { HelpView } from '@/components/views/help'
import { HREmployeesView } from '@/components/views/hr-employees'
import { ReviewCenterView } from '@/components/views/review-center'
import { BatchManagementView } from '@/components/views/batch-management'
import type { ViewId } from '@/lib/types'

const views: Record<ViewId, React.ComponentType> = {
  dashboard: DashboardView,
  attendance: AttendanceView,
  leave: LeaveView,
  calendar: CalendarView,
  tasks: TasksView,
  projects: ProjectsView,
  performance: PerformanceView,
  goals: GoalsView,
  learning: LearningView,
  documents: DocumentsView,
  requests: RequestsView,
  expenses: ExpensesView,
  assets: AssetsView,
  directory: DirectoryView,
  announcements: AnnouncementsView,
  notifications: NotificationsView,
  'ai-assistant': AIAssistantView,
  profile: ProfileView,
  audit: AuditView,
  team: TeamView,
  employees: EmployeesView,
  departments: DepartmentsView,
  onboarding: OnboardingView,
  travel: TravelView,
  offboarding: OffboardingView,
  meetings: MeetingsView,
  digest: DigestView,
  settings: SettingsView,
  help: HelpView,
  'hr-employees': HREmployeesView,
  'review-center': ReviewCenterView,
  'batch-management': BatchManagementView,
}

export function PortalShell() {
  const { view } = useApp()
  const ViewComponent = views[view] || DashboardView

  return (
    // Root: fixed to viewport height, no page-level scroll, overflow hidden.
    // Ambient background gives subtle depth — blurred color fields sit
    // behind the content layer and never distract from data.
    <div className="relative h-dvh flex overflow-hidden bg-ambient">
      {/* Decorative ambient orbs — extremely subtle, behind everything */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-0" aria-hidden>
        <div className="orb orb-teal absolute -top-32 -left-24 h-[28rem] w-[28rem]" />
        <div className="orb orb-violet absolute -top-24 right-1/3 h-[24rem] w-[24rem]" />
        <div className="orb orb-blue absolute bottom-0 right-0 h-[26rem] w-[26rem]" />
      </div>

      <MobileSidebar />
      <Sidebar />
      {/* Main column: fills remaining width, own overflow, min-h-0 for flex scroll */}
      <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden z-10">
        {/* Header: stable at top, shrink-0 (not sticky — column doesn't scroll past it) */}
        <div className="shrink-0">
          <Header />
        </div>
        {/* Main content: independent scroll, footer sits naturally at bottom */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="p-4 lg:p-6 max-w-[1600px] w-full mx-auto min-h-full flex flex-col">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1"
            >
              <ViewComponent />
            </motion.div>
            <Footer />
          </div>
        </main>
      </div>
      <CommandPalette />
      <QuickAddFAB />
    </div>
  )
}
