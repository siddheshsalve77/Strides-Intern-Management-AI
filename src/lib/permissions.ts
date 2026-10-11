import type { Role } from './types'

// Centralized Role-Based Access Control (RBAC) permission system
// This is the source of truth for all role permissions.
// Hiding UI buttons is NOT authorization — backend must validate against this matrix.

export type Permission =
  | 'login'
  | 'create_account'
  | 'assign_roles'
  | 'manage_employees'
  | 'view_own_attendance'
  | 'view_team_attendance'
  | 'view_org_attendance'
  | 'apply_leave'
  | 'approve_leave'
  | 'view_all_leaves'
  | 'create_tasks'
  | 'assign_tasks'
  | 'submit_tasks'
  | 'review_tasks'
  | 'give_marks'
  | 'manage_projects'
  | 'view_own_performance'
  | 'view_team_performance'
  | 'view_org_performance'
  | 'conduct_performance_review'
  | 'hr_administration'
  | 'system_administration'
  | 'deactivate_accounts'
  | 'view_audit_logs'
  | 'manage_holidays'
  | 'view_directory'
  | 'use_ai_assistant'

// Permission matrix — implements the role-permission matrix from the spec
const PERMISSION_MATRIX: Record<Role, Set<Permission>> = {
  INTERN: new Set([
    'login', 'view_own_attendance', 'apply_leave', 'submit_tasks',
    'view_own_performance', 'view_directory', 'use_ai_assistant',
  ]),
  EMPLOYEE: new Set([
    'login', 'view_own_attendance', 'apply_leave', 'submit_tasks',
    'view_own_performance', 'view_directory', 'use_ai_assistant',
  ]),
  MANAGER: new Set([
    'login', 'view_own_attendance', 'view_team_attendance', 'apply_leave', 'approve_leave',
    'create_tasks', 'assign_tasks', 'submit_tasks', 'review_tasks', 'give_marks',
    'manage_projects', 'view_own_performance', 'view_team_performance', 'conduct_performance_review',
    'view_directory', 'use_ai_assistant', 'view_audit_logs',
  ]),
  HR: new Set([
    'login', 'create_account', 'assign_roles', 'manage_employees',
    'view_own_attendance', 'view_team_attendance', 'view_org_attendance',
    'apply_leave', 'approve_leave', 'view_all_leaves',
    'create_tasks', 'assign_tasks', 'submit_tasks', 'review_tasks', 'give_marks',
    'manage_projects', 'view_own_performance', 'view_team_performance', 'view_org_performance',
    'conduct_performance_review', 'hr_administration', 'system_administration',
    'deactivate_accounts', 'view_audit_logs', 'manage_holidays',
    'view_directory', 'use_ai_assistant',
  ]),
  ADMIN: new Set([
    'login', 'view_own_attendance',
    'create_tasks', 'assign_tasks', 'submit_tasks', 'review_tasks', 'give_marks',
    'manage_projects', 'view_own_performance',
    'view_directory', 'use_ai_assistant', 'view_audit_logs', 'system_administration',
  ]),
}

// Check if a role has a specific permission
export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false
  return PERMISSION_MATRIX[role]?.has(permission) ?? false
}

// Check if a role has ANY of the given permissions
export function hasAnyPermission(role: Role | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.some((p) => hasPermission(role, p))
}

// Get all permissions for a role
export function getPermissions(role: Role): Permission[] {
  return Array.from(PERMISSION_MATRIX[role] ?? [])
}

// Roles that HR can assign when creating accounts
export const ASSIGNABLE_ROLES: Role[] = ['INTERN', 'EMPLOYEE', 'MANAGER', 'HR']

// Account lifecycle statuses
export const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'ARCHIVED'] as const
export type AccountStatus = typeof ACCOUNT_STATUSES[number]

// Check if account can login
export function canLogin(status: string | undefined | null): boolean {
  return status === 'ACTIVE'
}
