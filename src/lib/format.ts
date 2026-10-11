import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns'

export function fmtDate(d: string | Date | null | undefined, fmt = 'dd MMM yyyy') {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return format(date, fmt)
  } catch {
    return '—'
  }
}

export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return format(date, 'dd MMM yyyy, hh:mm a')
  } catch {
    return '—'
  }
}

export function fmtTime(d: string | Date | null | undefined) {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return format(date, 'hh:mm a')
  } catch {
    return '—'
  }
}

export function fmtRelative(d: string | Date | null | undefined) {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return '—'
  }
}

export function daysUntil(d: string | Date | null | undefined) {
  if (!d) return null
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return differenceInDays(date, new Date())
  } catch {
    return null
  }
}

export function inr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function pct(n: number) {
  return `${Math.round(n)}%`
}

const statusColors: Record<string, string> = {
  PRESENT: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  LATE: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  HALF_DAY: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  ABSENT: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  LEAVE: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  HOLIDAY: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  WFH: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  WEEKEND: 'bg-zinc-400/15 text-zinc-500 dark:text-zinc-400',
}

export function attendanceColor(status: string) {
  return statusColors[status] || 'bg-zinc-400/15 text-zinc-500'
}

const taskStatusColors: Record<string, string> = {
  CREATED: 'bg-zinc-400/15 text-zinc-600 dark:text-zinc-400',
  ASSIGNED: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  ACCEPTED: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  SUBMITTED: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  UNDER_REVIEW: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  APPROVED: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  COMPLETED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

export function taskColor(status: string) {
  return taskStatusColors[status] || 'bg-zinc-400/15 text-zinc-500'
}

export function taskLabel(status: string) {
  return status.split('_').map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(' ')
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-zinc-400/15 text-zinc-600 dark:text-zinc-400',
  MEDIUM: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  HIGH: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  CRITICAL: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
}

export function priorityColor(p: string) {
  return priorityColors[p] || 'bg-zinc-400/15 text-zinc-500'
}

const leaveColors: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  REJECTED: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  CANCELLED: 'bg-zinc-400/15 text-zinc-500',
}

export function leaveColor(s: string) {
  return leaveColors[s] || 'bg-zinc-400/15 text-zinc-500'
}

export function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

/**
 * Coerce a comma-separated string OR an array into a clean string[].
 * Handles null/undefined/objects → []. Prevents "x.split is not a function"
 * crashes when API data fields (files, links, attendeeIds, skills) are stored
 * as arrays in some records and as strings in others.
 */
export function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).map((s) => s.trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}
