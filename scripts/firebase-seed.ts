// Firebase Firestore seed script v2 — uses named imports (Bun compatible)
// Creates demo users in Firebase Authentication + Firestore profiles
// Run: bun scripts/firebase-seed.ts

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Initialize Firebase Admin with service account
const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
const serviceAccount = JSON.parse(readFileSync(resolve(saPath), 'utf8'))
const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id })
const auth = getAuth(app)
const db = getFirestore(app)

const PASSWORD = 'password123'

const users = [
  { email: 'admin@strides.com', name: 'System Administrator', role: 'ADMIN', designation: 'System Administrator', department: 'IT Support', team: 'Infrastructure', employmentType: 'Full-time', workLocation: 'Aurangabad', phone: '+91 98220 00100', skills: 'DevOps, Security, Linux', emergencyContact: 'Vivek', emergencyPhone: '+91 98220 00101', careerGoals: 'Maintain enterprise-grade secure infrastructure', employeeId: 'STR-ADM-001' },
  { email: 'hr@strides.com', name: 'Anil Deshmukh', role: 'HR', designation: 'HR Manager', department: 'Human Resources', team: 'People Ops', employmentType: 'Full-time', workLocation: 'Aurangabad', phone: '+91 98220 00200', skills: 'Recruitment, Policy, Employee Relations', emergencyContact: 'Sunita', emergencyPhone: '+91 98220 00201', careerGoals: 'Build a people-first organization', employeeId: 'STR-HR-002' },
  { email: 'priya@strides.com', name: 'Priya Nair', role: 'MANAGER', designation: 'Engineering Manager', department: 'Engineering', team: 'Platform', employmentType: 'Full-time', workLocation: 'Aurangabad', phone: '+91 98220 01010', skills: 'Node.js, System Design, Leadership', emergencyContact: 'Rajesh', emergencyPhone: '+91 98220 01011', careerGoals: 'Deliver scalable SaaS platforms', employeeId: 'STR-ENG-101' },
  { email: 'rahul@strides.com', name: 'Rahul Sharma', role: 'EMPLOYEE', designation: 'Senior Software Engineer', department: 'Engineering', team: 'Platform', managerEmail: 'priya@strides.com', employmentType: 'Full-time', workLocation: 'Aurangabad', phone: '+91 98220 02010', skills: 'TypeScript, React, Node.js, AWS', emergencyContact: 'Anita', emergencyPhone: '+91 98220 02011', careerGoals: 'Become Staff Engineer', employeeId: 'STR-ENG-201' },
  { email: 'neha@strides.com', name: 'Neha Verma', role: 'EMPLOYEE', designation: 'Software Engineer II', department: 'Engineering', team: 'Platform', managerEmail: 'priya@strides.com', employmentType: 'Full-time', workLocation: 'Aurangabad', phone: '+91 98220 02020', skills: 'Python, Data, SQL', emergencyContact: 'Suresh', emergencyPhone: '+91 98220 02021', careerGoals: 'Lead data platform team', employeeId: 'STR-ENG-202' },
  { email: 'siddhesh@strides.com', name: 'Siddhesh Patil', role: 'INTERN', designation: 'Software Intern', department: 'Engineering', team: 'Platform', managerEmail: 'priya@strides.com', employmentType: 'Intern', workLocation: 'Aurangabad', phone: '+91 98220 03010', skills: 'JavaScript, React, Learning Node.js', emergencyContact: 'Prakash', emergencyPhone: '+91 98220 03011', careerGoals: 'Get full-time offer after internship', employeeId: 'STR-INT-301', internshipStart: true, internshipEnd: true },
  { email: 'aisha@strides.com', name: 'Aisha Khan', role: 'INTERN', designation: 'QA Intern', department: 'Engineering', team: 'Platform', managerEmail: 'priya@strides.com', employmentType: 'Intern', workLocation: 'Aurangabad', phone: '+91 98220 03020', skills: 'Manual Testing, Cypress', emergencyContact: 'Faisal', emergencyPhone: '+91 98220 03021', careerGoals: 'Master test automation', employeeId: 'STR-INT-302', internshipStart: true, internshipEnd: true },
  { email: 'rohit@strides.com', name: 'Rohit Kale', role: 'EMPLOYEE', designation: 'IT Support Engineer', department: 'IT Support', team: 'Helpdesk', employmentType: 'Full-time', workLocation: 'Aurangabad', phone: '+91 98220 04010', skills: 'Windows, M365, Networking', emergencyContact: 'Kiran', emergencyPhone: '+91 98220 04011', careerGoals: 'Specialize in cloud administration', employeeId: 'STR-IT-401' },
]

async function main() {
  console.log('🔥 Starting Firebase Firestore seed...\n')
  const uidMap = new Map<string, string>()

  for (const u of users) {
    let uid: string
    try {
      const existing = await auth.getUserByEmail(u.email)
      uid = existing.uid
      console.log(`  ✓ Existing: ${u.email}`)
    } catch {
      const created = await auth.createUser({ email: u.email, password: PASSWORD, displayName: u.name })
      uid = created.uid
      console.log(`  + Created: ${u.email}`)
    }
    uidMap.set(u.email, uid)

    const profile: any = {
      uid, email: u.email, name: u.name, role: u.role, designation: u.designation,
      department: u.department, team: u.team, employmentType: u.employmentType,
      workLocation: u.workLocation, phone: u.phone,
      photoUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u.name)}`,
      skills: u.skills, emergencyContact: u.emergencyContact, emergencyPhone: u.emergencyPhone,
      careerGoals: u.careerGoals, employeeId: u.employeeId, status: 'ACTIVE',
      managerId: null, joinDate: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    if (u.internshipStart) profile.internshipStart = new Date(Date.now() - 45 * 86400000).toISOString()
    if (u.internshipEnd) profile.internshipEnd = new Date(Date.now() + 45 * 86400000).toISOString()
    await db.collection('users').doc(uid).set(profile, { merge: true })
  }

  // Set manager relationships
  for (const u of users) {
    if (u.managerEmail) {
      const uid = uidMap.get(u.email)!
      const mgrUid = uidMap.get(u.managerEmail)!
      await db.collection('users').doc(uid).update({ managerId: mgrUid })
    }
  }
  console.log('  ✓ Manager relationships set')

  // Create batch
  const batchRef = db.collection('batches').doc()
  await batchRef.set({
    name: 'Autumn 2026', program: 'Software Engineering Internship', department: 'Engineering',
    startDate: new Date(Date.now() - 45 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 45 * 86400000).toISOString(),
    capacity: 10, managerId: uidMap.get('priya@strides.com'),
    mentorIds: [uidMap.get('rahul@strides.com'), uidMap.get('neha@strides.com')].filter(Boolean),
    status: 'ACTIVE', createdAt: new Date().toISOString(),
  })
  for (const uid of [uidMap.get('siddhesh@strides.com'), uidMap.get('aisha@strides.com')].filter(Boolean)) {
    await db.collection('users').doc(uid!).update({ batchId: batchRef.id })
  }
  console.log('  ✓ Batch created')

  // Departments
  for (const d of ['Engineering', 'Human Resources', 'IT Support', 'Finance', 'Product']) {
    await db.collection('departments').add({ name: d, head: '', description: '', createdAt: new Date().toISOString() })
  }
  console.log('  ✓ Departments')

  // Holidays
  for (const h of [
    { name: 'Diwali', date: new Date(2026, 9, 21), type: 'PUBLIC', description: 'Festival of lights' },
    { name: 'Christmas', date: new Date(2026, 11, 25), type: 'PUBLIC', description: 'Christmas day' },
    { name: 'New Year', date: new Date(2027, 0, 1), type: 'PUBLIC', description: 'New year' },
    { name: 'Republic Day', date: new Date(2026, 0, 26), type: 'PUBLIC', description: 'National holiday' },
    { name: 'Strides Foundation Day', date: new Date(2026, 5, 12), type: 'COMPANY', description: 'Company anniversary' },
  ]) {
    await db.collection('holidays').add({ name: h.name, date: h.date.toISOString(), type: h.type, description: h.description, createdAt: new Date().toISOString() })
  }
  console.log('  ✓ Holidays')

  // Announcements
  for (const a of [
    { title: 'New company holiday policy', content: 'We have updated the holiday policy for 2026. Please review the updated calendar.', category: 'POLICY', priority: 'HIGH', authorName: 'Anil Deshmukh' },
    { title: 'Security training due Friday', content: 'All employees must complete the mandatory security awareness training by this Friday.', category: 'TRAINING', priority: 'HIGH', authorName: 'HR Team' },
    { title: 'Monthly town hall on Friday', content: 'Join us this Friday 4 PM for the monthly town hall.', category: 'EVENT', priority: 'MEDIUM', authorName: 'Priya Nair' },
    { title: 'Welcome our new interns', content: 'Please welcome Siddhesh and Aisha who joined the Engineering team as interns.', category: 'GENERAL', priority: 'MEDIUM', authorName: 'HR Team' },
  ]) {
    await db.collection('announcements').add({ ...a, authorId: '', publishedAt: new Date().toISOString(), createdAt: new Date().toISOString() })
  }
  console.log('  ✓ Announcements')

  // Tasks
  const mgrUid = uidMap.get('priya@strides.com')!
  const internUid = uidMap.get('siddhesh@strides.com')!
  await db.collection('tasks').add({
    title: 'Implement login screen', description: 'Build the employee login page with Firebase Auth integration',
    assignedTo: internUid, createdBy: mgrUid, status: 'IN_PROGRESS', priority: 'HIGH',
    startDate: new Date().toISOString(), deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    expectedDeliverable: 'Working login page with Firebase Auth',
    evaluationCriteria: 'Code quality, Firebase integration, UX',
    rubric: JSON.stringify([{ criteria: 'Code Quality', maxScore: 20 }, { criteria: 'Correctness', maxScore: 30 }, { criteria: 'Documentation', maxScore: 15 }, { criteria: 'Problem Solving', maxScore: 20 }, { criteria: 'Completeness', maxScore: 15 }]),
    requirements: JSON.stringify([{ item: 'Login page component', required: true }, { item: 'Firebase Auth integration', required: true }, { item: 'Error handling', required: true }, { item: 'Responsive design', required: false }]),
    submittedAt: null, completedAt: null, aiScore: null, aiFeedback: '',
    managerScore: null, managerFeedback: '', submissionNote: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
  console.log('  ✓ Task created')

  // Leave balances
  for (const [, uid] of uidMap) {
    await db.collection('leaveBalances').add({ employeeId: uid, casualLeave: 12, sickLeave: 12, earnedLeave: 15, year: 2026, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  console.log('  ✓ Leave balances')

  console.log(`\n✅ Seed complete! ${uidMap.size} users with password: ${PASSWORD}`)
  console.log('   Try: siddhesh@strides.com / priya@strides.com / hr@strides.com')
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1) })
