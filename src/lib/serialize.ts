import type { EmployeeT } from './types'

// Serialize a raw prisma employee into a clean employee object
export function serializeEmployee(e: any): EmployeeT {
  return {
    id: e.id,
    employeeId: e.employeeId,
    email: e.email,
    name: e.name,
    role: e.role,
    designation: e.designation,
    department: e.department,
    team: e.team,
    managerId: e.managerId ?? null,
    employmentType: e.employmentType,
    workLocation: e.workLocation,
    joinDate: e.joinDate?.toISOString?.() ?? e.joinDate ?? null,
    internshipStart: e.internshipStart?.toISOString?.() ?? null,
    internshipEnd: e.internshipEnd?.toISOString?.() ?? null,
    status: e.status,
    phone: e.phone,
    photoUrl: e.photoUrl,
    skills: e.skills,
    emergencyContact: e.emergencyContact,
    emergencyPhone: e.emergencyPhone,
    careerGoals: e.careerGoals,
  }
}

export function serializeTask(t: any) {
  return {
    ...t,
    assignee: t.assignee ? serializeEmployee(t.assignee) : null,
    project: t.project ? { id: t.project.id, name: t.project.name } : null,
    startDate: t.startDate?.toISOString?.() ?? null,
    deadline: t.deadline?.toISOString?.() ?? null,
    submittedAt: t.submittedAt?.toISOString?.() ?? null,
    completedAt: t.completedAt?.toISOString?.() ?? null,
  }
}

export function serializeLeave(l: any) {
  return {
    ...l,
    employee: l.employee ? serializeEmployee(l.employee) : undefined,
    fromDate: l.fromDate?.toISOString?.() ?? null,
    toDate: l.toDate?.toISOString?.() ?? null,
    appliedAt: l.appliedAt?.toISOString?.() ?? null,
    decidedAt: l.decidedAt?.toISOString?.() ?? null,
  }
}

export function serializeRequest(r: any) {
  return {
    ...r,
    employee: r.employee ? serializeEmployee(r.employee) : undefined,
    createdAt: r.createdAt?.toISOString?.() ?? null,
    updatedAt: r.updatedAt?.toISOString?.() ?? null,
  }
}

export function serializeExpense(e: any) {
  return {
    ...e,
    employee: e.employee ? serializeEmployee(e.employee) : undefined,
    date: e.date?.toISOString?.() ?? null,
    createdAt: e.createdAt?.toISOString?.() ?? null,
    updatedAt: e.updatedAt?.toISOString?.() ?? null,
  }
}

export function serializeProject(p: any) {
  return {
    ...p,
    startDate: p.startDate?.toISOString?.() ?? null,
    endDate: p.endDate?.toISOString?.() ?? null,
    members: p.members?.map((m: any) => ({ id: m.id, role: m.role, employee: serializeEmployee(m.employee) })) ?? [],
    tasks: p.tasks?.map((t: any) => ({
      ...t,
      startDate: t.startDate?.toISOString?.() ?? null,
      deadline: t.deadline?.toISOString?.() ?? null,
      submittedAt: t.submittedAt?.toISOString?.() ?? null,
      completedAt: t.completedAt?.toISOString?.() ?? null,
      assignee: t.assignee ? serializeEmployee(t.assignee) : null,
    })) ?? [],
  }
}
