// STRIDES ONE - shared types
export type Role = 'EMPLOYEE' | 'INTERN' | 'MANAGER' | 'HR' | 'ADMIN'

export type ViewId =
  | 'dashboard' | 'attendance' | 'leave' | 'calendar'
  | 'tasks' | 'projects' | 'performance' | 'goals'
  | 'learning' | 'documents' | 'requests' | 'expenses'
  | 'assets' | 'directory' | 'announcements' | 'notifications'
  | 'ai-assistant' | 'profile' | 'audit' | 'team' | 'employees' | 'departments'
  | 'onboarding' | 'travel' | 'offboarding' | 'meetings' | 'digest' | 'settings' | 'help' | 'hr-employees'
  | 'review-center' | 'batch-management'

export interface EmployeeT {
  id: string
  employeeId: string
  email: string
  name: string
  role: Role
  designation: string
  department: string
  team: string
  managerId?: string | null
  employmentType: string
  workLocation: string
  joinDate: string
  internshipStart?: string | null
  internshipEnd?: string | null
  status: string
  phone: string
  photoUrl: string
  skills: string
  emergencyContact: string
  emergencyPhone: string
  careerGoals: string
}

export interface AttendanceT {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  workHours: number
  breakMinutes: number
}

export interface LeaveRequestT {
  id: string
  employeeId: string
  employee?: EmployeeT
  leaveType: string
  fromDate: string
  toDate: string
  days: number
  reason: string
  status: string
  approverNote: string
  appliedAt: string
  decidedAt?: string | null
}

export interface LeaveBalanceT {
  id: string
  casualLeave: number
  sickLeave: number
  earnedLeave: number
}

export interface TaskT {
  id: string
  title: string
  description: string
  projectId?: string | null
  project?: { id: string; name: string } | null
  assigneeId?: string | null
  assignee?: EmployeeT | null
  creatorId: string
  status: string
  priority: string
  startDate: string
  deadline?: string | null
  submittedAt?: string | null
  completedAt?: string | null
  expectedDeliverable: string
  evaluationCriteria: string
  aiScore?: number | null
  aiFeedback: string
  managerScore?: number | null
  managerFeedback: string
  managerStatus?: string | null
  reviewerId?: string | null
  currentSubmissionId?: string | null
  submissionNote: string
  submissionRequirements?: SubmissionRequirement[]
}

// Submission requirement types — Google-Forms-like builder
export type SubmissionRequirementType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'CODE'
  | 'GITHUB_URL'
  | 'URL'
  | 'IMAGE'
  | 'FILE'
  | 'MULTIPLE_FILES'

export interface SubmissionRequirement {
  id: string
  type: SubmissionRequirementType
  label: string
  helpText?: string
  required: boolean
  options?: string[]
  maxLength?: number
  maxFiles?: number
  acceptedTypes?: string[]
}

export interface SubmissionField {
  requirementId: string
  value: string
  files: SubmissionFile[]
}

export interface SubmissionFile {
  name: string
  path: string
  mimeType: string
  size: number
  uploadedBy: string
  uploadedAt: string
  requirementId?: string
}

export interface ProjectT {
  id: string
  name: string
  description: string
  managerId: string
  status: string
  priority: string
  startDate: string
  endDate?: string | null
  progress: number
  members?: { id: string; role: string; employee: EmployeeT }[]
  tasks?: TaskT[]
}

export interface PerformanceT {
  id: string
  employeeId: string
  period: string
  overall: number
  goalAchievement: number
  taskCompletion: number
  quality: number
  attendance: number
  managerRating: number
  summary: string
}

export interface GoalT {
  id: string
  employeeId: string
  title: string
  description: string
  target: string
  deadline?: string | null
  progress: number
  status: string
}

export interface LearningT {
  id: string
  employeeId: string
  courseName: string
  category: string
  progress: number
  status: string
}

export interface DocumentT {
  id: string
  employeeId?: string | null
  title: string
  category: string
  fileName: string
  fileUrl: string
  uploadedAt: string
}

export interface HRRequestT {
  id: string
  ticketId: string
  employeeId: string
  employee?: EmployeeT
  category: string
  subject: string
  description: string
  priority: string
  status: string
  assignedTo: string
  resolution: string
  createdAt: string
}

export interface AnnouncementT {
  id: string
  title: string
  content: string
  category: string
  priority: string
  authorName: string
  publishedAt: string
}

export interface NotificationT {
  id: string
  employeeId: string
  title: string
  message: string
  type: string
  read: boolean
  link: string
  createdAt: string
}

export interface AssetT {
  id: string
  employeeId?: string | null
  assetId: string
  name: string
  model: string
  category: string
  issuedAt: string
  status: string
}

export interface ExpenseT {
  id: string
  employeeId: string
  employee?: EmployeeT
  category: string
  amount: number
  currency: string
  date: string
  description: string
  status: string
}

export interface HolidayT {
  id: string
  name: string
  date: string
  type: string
  description: string
}

export interface AuditLogT {
  id: string
  actorName: string
  action: string
  entity: string
  entityId: string
  details: string
  createdAt: string
}

export interface OnboardingTaskT {
  id: string
  employeeId: string
  title: string
  category: string
  description: string
  order: number
  completed: boolean
  completedAt: string | null
  dueDate: string | null
}

export interface TravelRequestT {
  id: string
  employeeId: string
  employee?: EmployeeT
  type: string
  destination: string
  purpose: string
  startDate: string
  endDate: string
  transport: string
  accommodation: boolean
  advanceAmount: number
  status: string
  approverNote: string
  appliedAt: string
  decidedAt?: string | null
}

export interface OffboardingT {
  id: string
  employeeId: string
  employee?: EmployeeT
  type: string
  reason: string
  requestedDate: string
  lastWorkingDay?: string | null
  status: string
  exitNotes: string
  createdAt: string
  updatedAt: string
}

export interface MeetingT {
  id: string
  title: string
  description: string
  organizerId: string
  organizer?: EmployeeT | null
  attendeeIds: string
  startTime: string
  endTime: string
  location: string
  type: string
  status: string
}

export interface TaskSubmissionT {
  id: string
  taskId: string
  employeeId: string
  version: number
  submissionNote: string
  fields: SubmissionField[]
  files: SubmissionFile[] | string
  links: { url: string; label?: string; requirementId?: string }[] | string
  status: string
  aiScore?: number | null
  aiFeedback: string
  managerScore?: number | null
  managerFeedback: string
  managerStatus?: string | null
  reviewerId?: string | null
  reviewScheduledAt?: string | null
  reviewedAt?: string | null
  submittedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ReviewRequestT {
  id: string
  submissionId: string
  taskId: string
  employeeId: string
  reviewerId?: string | null
  status: string
  priority: string
  scheduledAt?: string | null
  duration: number
  meetingLink: string
  notes: string
  createdAt: string
  task?: { id: string; title: string; deadline?: string | null; priority: string }
  employee?: EmployeeT
  reviewer?: EmployeeT | null
  submission?: TaskSubmissionT | null
}

export interface InternBatchT {
  id: string
  name: string
  program: string
  department: string
  startDate: string
  endDate: string
  capacity: number
  managerId?: string | null
  mentorIds: string
  status: string
  createdAt: string
}
