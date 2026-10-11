import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createNotification, createAuditLog } from '@/lib/firebase-admin'
import { hasPermission, canLogin, ACCOUNT_STATUSES } from '@/lib/permissions'
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

export async function GET(req: NextRequest) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!hasPermission(actor.role as Role, 'manage_employees')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const role = searchParams.get('role')

  let q: any = adminDb.collection('users')
  if (status) q = q.where('status', '==', status)
  if (role) q = q.where('role', '==', role)

  const snap = await q.get()
  const employees = snap.docs.map((d) => ({ uid: d.id, id: d.id, ...d.data() }))

  // Fetch manager names
  const mgrIds = [...new Set(employees.map((e: any) => e.managerId).filter(Boolean))]
  const managers = await Promise.all(mgrIds.map(async (id) => {
    const d = await adminDb.collection('users').doc(id).get()
    return d.exists ? { id: d.id, name: d.data()!.name } : null
  }))
  const mgrMap = new Map(managers.filter(Boolean).map((m: any) => [m.id, m]))

  return NextResponse.json(employees.map((e: any) => ({
    ...e,
    manager: e.managerId ? (mgrMap.get(e.managerId) || null) : null,
  })))
}

export async function POST(req: NextRequest) {
  const actor = await getActor(req)
  if (!actor) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!hasPermission(actor.role as Role, 'create_account')) {
    return NextResponse.json({ error: 'Forbidden: Only HR can create employee accounts' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, role, designation, department, team, managerId, employmentType, workLocation, joinDate, internshipStart, internshipEnd, phone } = body

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
  }

  // Create Firebase Auth user
  const { getAuth } = await import('firebase-admin/auth')
  const adminApp = (await import('@/lib/firebase-admin')).adminApp
  const auth = getAuth(adminApp)

  try {
    // Check if user already exists
    try {
      await auth.getUserByEmail(email)
      return NextResponse.json({ error: 'An employee with this email already exists' }, { status: 400 })
    } catch {
      // User doesn't exist — continue
    }

    const created = await auth.createUser({
      email, password: 'password123', displayName: name,
    })

    const profile: any = {
      uid: created.uid, email, name, role,
      designation: designation || '', department: department || 'Engineering',
      team: team || '', managerId: managerId || null,
      employmentType: employmentType || (role === 'INTERN' ? 'Intern' : 'Full-time'),
      workLocation: workLocation || 'Aurangabad',
      joinDate: joinDate ? new Date(joinDate).toISOString() : new Date().toISOString(),
      phone: phone || '',
      photoUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
      skills: '', emergencyContact: '', emergencyPhone: '', careerGoals: '',
      status: 'ACTIVE',
      employeeId: `STR-${role.substring(0,3)}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    if (internshipStart) profile.internshipStart = new Date(internshipStart).toISOString()
    if (internshipEnd) profile.internshipEnd = new Date(internshipEnd).toISOString()

    await adminDb.collection('users').doc(created.uid).set(profile)

    // Create leave balance
    await adminDb.collection('leaveBalances').add({
      employeeId: created.uid, casualLeave: 12, sickLeave: 12, earnedLeave: 15, year: 2026,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })

    // Audit log
    await createAuditLog(actor.uid, actor.name, 'CREATE_ACCOUNT', 'Employee', created.uid, `Created ${role} account for ${name} (${email})`)

    // Welcome notification
    await createNotification(created.uid, 'Welcome to Strides One!', `Your account has been created. Employee ID: ${profile.employeeId}`, 'INFO')

    return NextResponse.json({ ...profile, id: created.uid, message: `Account created. Employee ID: ${profile.employeeId}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create account' }, { status: 500 })
  }
}
