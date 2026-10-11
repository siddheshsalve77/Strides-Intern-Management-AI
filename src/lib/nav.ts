import type { ViewId } from '@/lib/types'
import type { Role } from '@/lib/types'
import {
  LayoutDashboard, Clock, CalendarDays, ListChecks, FolderKanban,
  TrendingUp, Target, GraduationCap, FileText, LifeBuoy, Wallet,
  Laptop, Users, Megaphone, Bell, Bot, User, ScrollText, UsersRound,
  Building2, ClipboardCheck, Plane, UserMinus, Video, Mail, Settings, HelpCircle, UserCog, ClipboardCheck as ReviewIcon, Layers,
} from 'lucide-react'

export interface NavItem {
  id: ViewId
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: Role[] // if undefined, available to all
  badge?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// ============================================================
// NAVIGATION — grouped as an enterprise operating system:
// WORK → the job to be done
// PEOPLE → who you work with
// TIME & HR → your employment lifecycle
// SERVICES → operational requests
// ADMINISTRATION → HR/Admin controls (role-gated)
// WORKSPACE → personal tools & identity
// ============================================================
export const navSections: NavSection[] = [
  {
    title: 'Work',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'tasks', label: 'My Tasks', icon: ListChecks },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
      { id: 'meetings', label: 'Meetings', icon: Video },
      { id: 'review-center', label: 'Review Center', icon: ReviewIcon, roles: ['MANAGER', 'ADMIN', 'HR'] },
    ],
  },
  {
    title: 'People',
    items: [
      { id: 'team', label: 'My Team', icon: UsersRound, roles: ['MANAGER', 'HR', 'ADMIN'] },
      { id: 'directory', label: 'Directory', icon: Users },
      { id: 'performance', label: 'Performance', icon: TrendingUp },
      { id: 'goals', label: 'Goals', icon: Target },
    ],
  },
  {
    title: 'Time & HR',
    items: [
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'leave', label: 'Leave', icon: CalendarDays },
      { id: 'learning', label: 'Learning', icon: GraduationCap },
      { id: 'documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    title: 'Services',
    items: [
      { id: 'requests', label: 'Service Requests', icon: LifeBuoy },
      { id: 'expenses', label: 'Expenses', icon: Wallet },
      { id: 'travel', label: 'Travel', icon: Plane },
      { id: 'assets', label: 'My Assets', icon: Laptop },
      { id: 'onboarding', label: 'Onboarding', icon: ClipboardCheck, roles: ['INTERN', 'EMPLOYEE', 'HR', 'ADMIN'] },
      { id: 'offboarding', label: 'Offboarding', icon: UserMinus, roles: ['HR', 'ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'hr-employees', label: 'Employee Mgmt', icon: UserCog, roles: ['HR'] },
      { id: 'batch-management', label: 'Batches', icon: Layers, roles: ['HR'] },
      { id: 'employees', label: 'Employees', icon: Users, roles: ['HR', 'ADMIN'] },
      { id: 'departments', label: 'Departments', icon: Building2, roles: ['HR', 'ADMIN'] },
      { id: 'audit', label: 'Audit Logs', icon: ScrollText, roles: ['HR', 'ADMIN'] },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, badge: 'AI' },
      { id: 'digest', label: 'Weekly Digest', icon: Mail, badge: 'AI' },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help & FAQ', icon: HelpCircle },
    ],
  },
]

export function navForRole(role: Role): NavSection[] {
  return navSections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(role)) }))
    .filter((s) => s.items.length > 0)
}

export const viewTitle: Record<ViewId, string> = {
  dashboard: 'Dashboard',
  attendance: 'Attendance & Time',
  leave: 'Leave Management',
  calendar: 'Holiday Calendar',
  tasks: 'My Tasks',
  projects: 'Projects',
  performance: 'Performance',
  goals: 'Goals',
  learning: 'Learning & Development',
  documents: 'Documents',
  requests: 'Service Requests',
  expenses: 'Expenses & Reimbursement',
  assets: 'My Assets',
  directory: 'Company Directory',
  announcements: 'Announcements',
  notifications: 'Notifications',
  'ai-assistant': 'AI Assistant',
  profile: 'My Profile',
  audit: 'Audit Logs',
  team: 'My Team',
  employees: 'Employees',
  departments: 'Departments',
  onboarding: 'Onboarding',
  travel: 'Travel Requests',
  offboarding: 'Offboarding',
  meetings: 'Meetings & Schedule',
  digest: 'Weekly Digest',
  settings: 'Settings',
  help: 'Help & FAQ',
  'hr-employees': 'Employee Management',
  'review-center': 'Review Center',
  'batch-management': 'Batch Management',
}
