import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification, createAuditLog } from '@/lib/firebase-admin'
import { hasPermission, ACCOUNT_STATUSES } from '@/lib/permissions'
import type { Role } from '@/lib/types'

async function getActor(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const idToken = authHeader.substring(7)
  const { verifyIdToken, getUserProfile } = await import('@/lib/firebase-admin')
  const decoded = await verifyIdToken(idToken)
  if (!decoded) return null
  const profile = await getUserProfile(decoded.uid)
  if (!profile) return null
  return { uid: decoded.uid, ...profile }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!hasPermission(actor.role as Role, 'manage_employees')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await adminDb.collection('users').doc(id).get()
  if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ uid: doc.id, id: doc.id, ...doc.data() })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!hasPermission(actor.role as Role, 'manage_employees')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { role, department, managerId, designation, team, status, employmentType, workLocation } = body

  // Prevent self-modification of role/status
  if (actor.uid === id && (role !== undefined || status !== undefined)) {
    return NextResponse.json({ error: 'You cannot change your own role or status' }, { status: 400 })
  }

  const data: any = { updatedAt: new Date().toISOString() }
  if (role !== undefined) data.role = role
  if (department !== undefined) data.department = department
  if (managerId !== undefined) data.managerId = managerId || null
  if (designation !== undefined) data.designation = designation
  if (team !== undefined) data.team = team
  if (status !== undefined) data.status = status
  if (employmentType !== undefined) data.employmentType = employmentType
  if (workLocation !== undefined) data.workLocation = workLocation

  // Audit sensitive changes
  const target = await adminDb.collection('users').doc(id).get()
  if (target.exists) {
    const targetData = target.data()!
    if (role !== undefined && role !== targetData.role) {
      await createAuditLog(actor.uid, (actor as any).name, 'ROLE_CHANGE', 'Employee', id, `Changed role from ${targetData.role} to ${role}`)
    }
    if (status !== undefined && status !== targetData.status) {
      await createAuditLog(actor.uid, (actor as any).name, 'STATUS_CHANGE', 'Employee', id, `Changed status from ${targetData.status} to ${status}`)
      const statusMsg: Record<string, string> = {
        ACTIVE: 'Your account has been activated.',
        SUSPENDED: 'Your account has been suspended. Please contact HR.',
        INACTIVE: 'Your account has been deactivated. Please contact HR.',
        ARCHIVED: 'Your account has been archived.',
      }
      await createNotification(id, 'Account status updated', statusMsg[status] || `Your status is now ${status}`, 'INFO')
    }
  }

  await adminDb.collection('users').doc(id).update(data)
  const doc = await adminDb.collection('users').doc(id).get()
  return NextResponse.json({ uid: doc.id, id: doc.id, ...doc.data() })
}
