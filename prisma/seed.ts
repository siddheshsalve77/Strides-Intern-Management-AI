import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30)

function daysAgo(n: number) {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d
}
function daysAhead(n: number) {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  return d
}
function atTime(base: Date, h: number, m: number) {
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

async function main() {
  // Clean
  await db.reviewRequest.deleteMany()
  await db.taskSubmission.deleteMany()
  await db.internBatch.deleteMany()
  await db.meeting.deleteMany()
  await db.offboarding.deleteMany()
  await db.travelRequest.deleteMany()
  await db.onboardingTask.deleteMany()
  await db.auditLog.deleteMany()
  await db.notification.deleteMany()
  await db.expense.deleteMany()
  await db.asset.deleteMany()
  await db.announcement.deleteMany()
  await db.hRRequest.deleteMany()
  await db.document.deleteMany()
  await db.learning.deleteMany()
  await db.goal.deleteMany()
  await db.performance.deleteMany()
  await db.task.deleteMany()
  await db.projectMember.deleteMany()
  await db.project.deleteMany()
  await db.leaveRequest.deleteMany()
  await db.leaveBalance.deleteMany()
  await db.attendance.deleteMany()
  await db.holiday.deleteMany()
  await db.department.deleteMany()
  await db.employee.deleteMany()

  // Departments
  const eng = await db.department.create({ data: { name: 'Engineering', head: 'Priya Nair', description: 'Software product engineering' } })
  const hr = await db.department.create({ data: { name: 'Human Resources', head: 'Anil Deshmukh', description: 'People operations & HR' } })
  const itsup = await db.department.create({ data: { name: 'IT Support', head: 'Rohit Kale', description: 'Internal IT & infrastructure' } })
  const fin = await db.department.create({ data: { name: 'Finance', head: 'Meera Joshi', description: 'Finance & accounting' } })
  await db.department.create({ data: { name: 'Product', head: 'Sneha Patil', description: 'Product management & design' } })

  // Employees
  // Admin
  const admin = await db.employee.create({
    data: {
      employeeId: 'STR-ADM-001', email: 'admin@strides.com', name: 'System Administrator',
      role: 'ADMIN', designation: 'System Administrator', department: 'IT Support', team: 'Infrastructure',
      employmentType: 'Full-time', workLocation: 'Aurangabad', joinDate: daysAgo(900),
      phone: '+91 98220 00100', photoUrl: 'https://i.pravatar.cc/150?img=12',
      skills: 'DevOps, Security, Linux', emergencyContact: 'Vivek', emergencyPhone: '+91 98220 00101',
      careerGoals: 'Maintain enterprise-grade secure infrastructure', status: 'ACTIVE',
    },
  })

  // HR
  const hrEmp = await db.employee.create({
    data: {
      employeeId: 'STR-HR-002', email: 'hr@strides.com', name: 'Anil Deshmukh',
      role: 'HR', designation: 'HR Manager', department: 'Human Resources', team: 'People Ops',
      employmentType: 'Full-time', workLocation: 'Aurangabad', joinDate: daysAgo(800),
      phone: '+91 98220 00200', photoUrl: 'https://i.pravatar.cc/150?img=15',
      skills: 'Recruitment, Policy, Employee Relations', emergencyContact: 'Sunita', emergencyPhone: '+91 98220 00201',
      careerGoals: 'Build a people-first organization', status: 'ACTIVE',
    },
  })

  // Manager
  const manager = await db.employee.create({
    data: {
      employeeId: 'STR-ENG-101', email: 'priya@strides.com', name: 'Priya Nair',
      role: 'MANAGER', designation: 'Engineering Manager', department: 'Engineering', team: 'Platform',
      employmentType: 'Full-time', workLocation: 'Aurangabad', joinDate: daysAgo(700),
      phone: '+91 98220 01010', photoUrl: 'https://i.pravatar.cc/150?img=49',
      skills: 'Node.js, System Design, Leadership', emergencyContact: 'Rajesh', emergencyPhone: '+91 98220 01011',
      careerGoals: 'Deliver scalable SaaS platforms', status: 'ACTIVE',
    },
  })

  // Employees
  const emp1 = await db.employee.create({
    data: {
      employeeId: 'STR-ENG-201', email: 'rahul@strides.com', name: 'Rahul Sharma',
      role: 'EMPLOYEE', designation: 'Senior Software Engineer', department: 'Engineering', team: 'Platform',
      managerId: manager.id, employmentType: 'Full-time', workLocation: 'Aurangabad', joinDate: daysAgo(420),
      phone: '+91 98220 02010', photoUrl: 'https://i.pravatar.cc/150?img=33',
      skills: 'TypeScript, React, Node.js, AWS', emergencyContact: 'Anita', emergencyPhone: '+91 98220 02011',
      careerGoals: 'Become Staff Engineer', status: 'ACTIVE',
    },
  })
  const emp2 = await db.employee.create({
    data: {
      employeeId: 'STR-ENG-202', email: 'neha@strides.com', name: 'Neha Verma',
      role: 'EMPLOYEE', designation: 'Software Engineer II', department: 'Engineering', team: 'Platform',
      managerId: manager.id, employmentType: 'Full-time', workLocation: 'Aurangabad', joinDate: daysAgo(300),
      phone: '+91 98220 02020', photoUrl: 'https://i.pravatar.cc/150?img=45',
      skills: 'Python, Data, SQL', emergencyContact: 'Suresh', emergencyPhone: '+91 98220 02021',
      careerGoals: 'Lead data platform team', status: 'ACTIVE',
    },
  })
  // Interns
  const intern1 = await db.employee.create({
    data: {
      employeeId: 'STR-INT-301', email: 'siddhesh@strides.com', name: 'Siddhesh Patil',
      role: 'INTERN', designation: 'Software Intern', department: 'Engineering', team: 'Platform',
      managerId: manager.id, employmentType: 'Intern', workLocation: 'Aurangabad', joinDate: daysAgo(45),
      internshipStart: daysAgo(45), internshipEnd: daysAhead(45),
      phone: '+91 98220 03010', photoUrl: 'https://i.pravatar.cc/150?img=68',
      skills: 'JavaScript, React, Learning Node.js', emergencyContact: 'Prakash', emergencyPhone: '+91 98220 03011',
      careerGoals: 'Get full-time offer after internship', status: 'ACTIVE',
    },
  })
  const intern2 = await db.employee.create({
    data: {
      employeeId: 'STR-INT-302', email: 'aisha@strides.com', name: 'Aisha Khan',
      role: 'INTERN', designation: 'QA Intern', department: 'Engineering', team: 'Platform',
      managerId: manager.id, employmentType: 'Intern', workLocation: 'Aurangabad', joinDate: daysAgo(30),
      internshipStart: daysAgo(30), internshipEnd: daysAhead(60),
      phone: '+91 98220 03020', photoUrl: 'https://i.pravatar.cc/150?img=9',
      skills: 'Manual Testing, Cypress', emergencyContact: 'Faisal', emergencyPhone: '+91 98220 03021',
      careerGoals: 'Master test automation', status: 'ACTIVE',
    },
  })
  // IT support staff
  const itStaff = await db.employee.create({
    data: {
      employeeId: 'STR-IT-401', email: 'rohit@strides.com', name: 'Rohit Kale',
      role: 'EMPLOYEE', designation: 'IT Support Engineer', department: 'IT Support', team: 'Helpdesk',
      employmentType: 'Full-time', workLocation: 'Aurangabad', joinDate: daysAgo(500),
      phone: '+91 98220 04010', photoUrl: 'https://i.pravatar.cc/150?img=53',
      skills: 'Windows, M365, Networking', emergencyContact: 'Kiran', emergencyPhone: '+91 98220 04011',
      careerGoals: 'Specialize in cloud administration', status: 'ACTIVE',
    },
  })

  // More employees for directory
  const extras = [
    ['STR-ENG-203', 'karan@strides.com', 'Karan Mehta', 'Software Engineer I', 'Engineering', 'Platform', 'https://i.pravatar.cc/150?img=59'],
    ['STR-ENG-204', 'divya@strides.com', 'Divya Rao', 'Frontend Engineer', 'Engineering', 'Platform', 'https://i.pravatar.cc/150?img=31'],
    ['STR-PRD-501', 'sneha@strides.com', 'Sneha Patil', 'Product Manager', 'Product', 'Product', 'https://i.pravatar.cc/150?img=44'],
    ['STR-FIN-601', 'meera@strides.com', 'Meera Joshi', 'Finance Lead', 'Finance', 'Accounts', 'https://i.pravatar.cc/150?img=20'],
  ] as const
  for (const [eid, email, name, desig, dept, team, photo] of extras) {
    await db.employee.create({
      data: {
        employeeId: eid, email, name, role: 'EMPLOYEE', designation: desig, department: dept, team,
        managerId: manager.id, employmentType: 'Full-time', workLocation: 'Aurangabad', joinDate: daysAgo(200 + Math.floor(Math.random() * 100)),
        phone: '+91 98220 00000', photoUrl: photo, skills: 'General', status: 'ACTIVE',
      },
    })
  }

  // Leave balances
  for (const e of [admin, hrEmp, manager, emp1, emp2, intern1, intern2, itStaff]) {
    await db.leaveBalance.create({ data: { employeeId: e.id } })
  }

  // Attendance: last 30 days for emp1, intern1, manager, emp2
  for (const e of [emp1, intern1, manager, emp2]) {
    for (let i = 0; i < 30; i++) {
      const d = daysAgo(i)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) {
        await db.attendance.create({ data: { employeeId: e.id, date: d, status: 'WEEKEND' } })
        continue
      }
      const late = i % 7 === 0
      const checkIn = late ? atTime(d, 10, 15) : atTime(d, 9, 30 + (i % 20))
      const checkOut = atTime(d, 18, 30)
      const hrs = (checkOut.getTime() - checkIn.getTime()) / 3600000
      await db.attendance.create({
        data: { employeeId: e.id, date: d, checkIn, checkOut, status: late ? 'LATE' : 'PRESENT', workHours: Math.round(hrs * 100) / 100, breakMinutes: 45 },
      })
    }
  }

  // Today's attendance for all team members (so Manager's team view shows real data)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const teamMembers = await db.employee.findMany({ where: { managerId: manager.id } })
  for (const m of teamMembers) {
    const dow = today.getDay()
    if (dow === 0 || dow === 6) {
      await db.attendance.create({ data: { employeeId: m.id, date: today, status: 'WEEKEND' } })
      continue
    }
    // Some present, some late, one absent, one WFH — varied realistic statuses
    const idx = teamMembers.indexOf(m)
    let status = 'PRESENT'
    let checkIn: Date | null = atTime(today, 9, 30 + (idx % 15))
    let checkOut: Date | null = null
    if (idx % 4 === 0) { status = 'LATE'; checkIn = atTime(today, 10, 15) }
    else if (idx % 5 === 0 && idx !== 0) { status = 'WFH'; checkIn = atTime(today, 9, 45) }
    else if (idx === 3) { status = 'ABSENT'; checkIn = null }
    // most have checked out already (past 6:30 PM), some still in
    const nowHour = new Date().getHours()
    if (nowHour >= 18 && checkIn) { checkOut = atTime(today, 18, 30) }
    const hrs = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600000 : 0
    await db.attendance.create({
      data: { employeeId: m.id, date: today, checkIn, checkOut, status, workHours: Math.round(hrs * 100) / 100, breakMinutes: 45 },
    })
  }
  // Also ensure manager has today's attendance
  const mgrAttToday = await db.attendance.findFirst({ where: { employeeId: manager.id, date: today } })
  if (!mgrAttToday) {
    await db.attendance.create({
      data: { employeeId: manager.id, date: today, checkIn: atTime(today, 9, 15), checkOut: atTime(today, 18, 45), status: 'PRESENT', workHours: 9.5, breakMinutes: 45 },
    })
  }

  // Holidays
  await db.holiday.create({ data: { name: 'Republic Day', date: new Date(2026, 0, 26), type: 'PUBLIC', description: 'National holiday' } })
  await db.holiday.create({ data: { name: 'Holi', date: new Date(2026, 2, 18), type: 'PUBLIC', description: 'Festival of colors' } })
  await db.holiday.create({ data: { name: 'Independence Day', date: new Date(2026, 7, 15), type: 'PUBLIC', description: 'National holiday' } })
  await db.holiday.create({ data: { name: 'Ganesh Chaturthi', date: new Date(2026, 8, 5), type: 'PUBLIC', description: 'Maharashtra festival' } })
  await db.holiday.create({ data: { name: 'Diwali', date: new Date(2026, 9, 21), type: 'PUBLIC', description: 'Festival of lights' } })
  await db.holiday.create({ data: { name: 'Christmas', date: new Date(2026, 11, 25), type: 'PUBLIC', description: 'Christmas day' } })
  await db.holiday.create({ data: { name: 'Strides Foundation Day', date: new Date(2026, 5, 12), type: 'COMPANY', description: 'Company anniversary' } })
  await db.holiday.create({ data: { name: 'New Year', date: new Date(2027, 0, 1), type: 'PUBLIC', description: 'New year' } })

  // Projects
  const proj1 = await db.project.create({
    data: { name: 'STRIDES ONE Portal', description: 'Unified employee experience platform', managerId: manager.id, status: 'ACTIVE', priority: 'CRITICAL', startDate: daysAgo(60), progress: 72 },
  })
  const proj2 = await db.project.create({
    data: { name: 'Mobile App v2', description: 'Companion mobile application', managerId: manager.id, status: 'ACTIVE', priority: 'HIGH', startDate: daysAgo(30), progress: 28 },
  })
  const proj3 = await db.project.create({
    data: { name: 'Data Warehouse Migration', description: 'Move analytics to new warehouse', managerId: manager.id, status: 'ON_HOLD', priority: 'MEDIUM', startDate: daysAgo(90), progress: 45 },
  })
  // project members
  for (const [p, e, r] of [[proj1.id, manager.id, 'LEAD'], [proj1.id, emp1.id, 'MEMBER'], [proj1.id, emp2.id, 'MEMBER'], [proj1.id, intern1.id, 'CONTRIBUTOR'], [proj2.id, intern2.id, 'CONTRIBUTOR'], [proj2.id, emp2.id, 'MEMBER'], [proj3.id, emp1.id, 'MEMBER']] as [string, string, string][]) {
    await db.projectMember.create({ data: { projectId: p, employeeId: e, role: r } })
  }

  // Tasks
  const tasks = [
    [proj1.id, intern1.id, manager.id, 'Implement login screen', 'Build the employee login page with role selection', 'IN_PROGRESS', 'HIGH', 0, 2],
    [proj1.id, intern1.id, manager.id, 'Attendance check-in API', 'Create the API to mark attendance check-in', 'IN_PROGRESS', 'HIGH', 0, 3],
    [proj1.id, emp1.id, manager.id, 'Leave workflow engine', 'Build the leave approval workflow', 'SUBMITTED', 'CRITICAL', 0, 1],
    [proj1.id, emp2.id, manager.id, 'Dashboard widgets', 'Design and implement dashboard widgets', 'UNDER_REVIEW', 'MEDIUM', 0, -1],
    [proj1.id, intern2.id, manager.id, 'E2E test for leave flow', 'Cypress tests for leave application', 'ASSIGNED', 'MEDIUM', 0, 4],
    [proj1.id, intern1.id, manager.id, 'AI assistant integration', 'Integrate LLM assistant into portal', 'CREATED', 'HIGH', 0, 7],
    [proj2.id, emp2.id, manager.id, 'Mobile dashboard', 'Responsive dashboard for mobile', 'IN_PROGRESS', 'MEDIUM', 0, 5],
    [proj3.id, emp1.id, manager.id, 'ETL scripts', 'Write ETL scripts for warehouse', 'COMPLETED', 'HIGH', 100, -10],
    [proj1.id, intern1.id, manager.id, 'Notification center UI', 'Build the notification dropdown', 'COMPLETED', 'MEDIUM', 100, -5],
    [proj1.id, intern1.id, manager.id, 'Directory page', 'Company directory with search', 'CREATED', 'LOW', 0, 6],
  ] as const
  for (const [pid, aid, cid, title, desc, status, pri, startOffset, deadlineOffset] of tasks) {
    const t = await db.task.create({
      data: {
        title, description: desc, projectId: pid as string, assigneeId: aid as string, creatorId: cid as string,
        status: status as string, priority: pri as string, startDate: daysAgo(startOffset as number),
        deadline: daysAhead(deadlineOffset as number),
        expectedDeliverable: 'Working implementation with tests',
        evaluationCriteria: 'Code quality, tests pass, meets requirements',
      },
    })
    if (status === 'SUBMITTED') {
      await db.task.update({ where: { id: t.id }, data: { submittedAt: daysAgo(1), submissionNote: 'Implemented leave workflow with manager approval and auto balance update.' } })
    }
    if (status === 'COMPLETED') {
      await db.task.update({ where: { id: t.id }, data: { completedAt: daysAgo(5), aiScore: 88, aiFeedback: 'Good implementation. Tests could cover more edge cases.', managerScore: 90, managerFeedback: 'Solid work, shipped on time.' } })
    }
  }

  // Leave requests
  await db.leaveRequest.create({ data: { employeeId: intern1.id, leaveType: 'CASUAL', fromDate: daysAhead(5), toDate: daysAhead(6), days: 2, reason: 'Family function', status: 'PENDING' } })
  await db.leaveRequest.create({ data: { employeeId: emp1.id, leaveType: 'SICK', fromDate: daysAgo(8), toDate: daysAgo(7), days: 2, reason: 'Fever', status: 'APPROVED', approverId: manager.id, approverNote: 'Get well soon', decidedAt: daysAgo(7) } })
  await db.leaveRequest.create({ data: { employeeId: emp2.id, leaveType: 'EARNED', fromDate: daysAhead(20), toDate: daysAhead(25), days: 6, reason: 'Vacation', status: 'PENDING' } })
  await db.leaveRequest.create({ data: { employeeId: intern2.id, leaveType: 'CASUAL', fromDate: daysAgo(15), toDate: daysAgo(14), days: 2, reason: 'Personal work', status: 'REJECTED', approverId: manager.id, approverNote: 'Critical delivery week', decidedAt: daysAgo(16) } })

  // Performance — for all employees including manager, HR, admin
  for (const e of [manager, hrEmp, emp1, emp2, intern1, intern2, itStaff]) {
    const base = e.role === 'MANAGER' ? 88 : e.role === 'HR' ? 85 : 80
    await db.performance.create({
      data: {
        employeeId: e.id, period: 'Q3-2026',
        overall: base + Math.floor(Math.random() * 10),
        goalAchievement: base + Math.floor(Math.random() * 10),
        taskCompletion: base + Math.floor(Math.random() * 10),
        quality: base + Math.floor(Math.random() * 10),
        attendance: 90 + Math.floor(Math.random() * 10),
        managerRating: base + Math.floor(Math.random() * 10),
        summary: e.role === 'MANAGER'
          ? 'Strong leadership, delivered key milestones on time. Excellent team mentorship.'
          : e.role === 'INTERN'
          ? 'Promising intern showing good progress. Needs to focus on estimation accuracy.'
          : 'Consistent performer with strong ownership and collaboration.',
      },
    })
  }

  // Goals
  await db.goal.create({ data: { employeeId: intern1.id, title: 'Improve SQL Development Skills', description: 'Master intermediate SQL', target: 'Complete 3 SQL projects', deadline: new Date(2026, 11, 31), progress: 65, status: 'ACTIVE' } })
  await db.goal.create({ data: { employeeId: intern1.id, title: 'Ship attendance module', description: 'Deliver attendance feature end to end', target: 'Merge to main', deadline: daysAhead(7), progress: 80, status: 'ACTIVE' } })
  await db.goal.create({ data: { employeeId: emp1.id, title: 'Lead platform migration', description: 'Migrate legacy services', target: 'Decommission 3 legacy services', deadline: new Date(2026, 11, 31), progress: 40, status: 'ACTIVE' } })
  await db.goal.create({ data: { employeeId: emp2.id, title: 'Data pipeline reliability', description: 'Improve pipeline uptime', target: '99.9% uptime', deadline: new Date(2026, 10, 30), progress: 55, status: 'ACTIVE' } })

  // Learning
  const courses = [
    ['SQL Fundamentals', 'TECHNICAL', 100], ['Python for Data', 'TECHNICAL', 80], ['AWS Fundamentals', 'TECHNICAL', 45],
    ['Company Security Training', 'COMPLIANCE', 100], ['Next.js 16', 'TECHNICAL', 60], ['Effective Communication', 'SOFT_SKILLS', 30],
  ] as const
  for (const e of [intern1, emp1]) {
    for (const [name, cat, prog] of courses) {
      await db.learning.create({
        data: { employeeId: e.id, courseName: name, category: cat, progress: prog, status: prog === 100 ? 'COMPLETED' : 'IN_PROGRESS', completedAt: prog === 100 ? daysAgo(10) : null },
      })
    }
  }

  // Documents
  await db.document.create({ data: { employeeId: intern1.id, title: 'Internship Offer Letter', category: 'OFFER', fileName: 'offer-letter.pdf', fileUrl: '#' } })
  await db.document.create({ data: { employeeId: intern1.id, title: 'NDA', category: 'HR', fileName: 'nda.pdf', fileUrl: '#' } })
  await db.document.create({ data: { employeeId: emp1.id, title: 'Employment Agreement', category: 'OFFER', fileName: 'agreement.pdf', fileUrl: '#' } })
  await db.document.create({ data: { title: 'Company Leave Policy', category: 'POLICY', fileName: 'leave-policy.pdf', fileUrl: '#' } })
  await db.document.create({ data: { title: 'Code of Conduct', category: 'POLICY', fileName: 'code-of-conduct.pdf', fileUrl: '#' } })
  await db.document.create({ data: { title: 'Remote Work Policy', category: 'POLICY', fileName: 'remote-work.pdf', fileUrl: '#' } })
  await db.document.create({ data: { employeeId: intern1.id, title: 'Security Training Certificate', category: 'CERTIFICATE', fileName: 'security-cert.pdf', fileUrl: '#' } })

  // HR Requests
  await db.hRRequest.create({ data: { ticketId: 'STR-IT-1042', employeeId: intern1.id, category: 'IT', subject: 'Laptop running slow', description: 'My laptop freezes during builds', priority: 'MEDIUM', status: 'IN_PROGRESS', assignedTo: 'IT Support' } })
  await db.hRRequest.create({ data: { ticketId: 'STR-HR-2031', employeeId: emp1.id, category: 'HR', subject: 'Address update', description: 'Need to update my permanent address', priority: 'LOW', status: 'RESOLVED', assignedTo: 'HR', resolution: 'Address updated in records' } })
  await db.hRRequest.create({ data: { ticketId: 'STR-ADM-3094', employeeId: emp2.id, category: 'ADMIN', subject: 'AC not working', description: 'AC in cabin not cooling', priority: 'MEDIUM', status: 'ASSIGNED', assignedTo: 'Facilities' } })
  await db.hRRequest.create({ data: { ticketId: 'STR-IT-1055', employeeId: intern2.id, category: 'IT', subject: 'Email access on mobile', description: 'Unable to setup email on phone', priority: 'LOW', status: 'CREATED' } })
  await db.hRRequest.create({ data: { ticketId: 'STR-FIN-4002', employeeId: emp1.id, category: 'FINANCE', subject: 'Reimbursement delay', description: 'Last month reimbursement not processed', priority: 'HIGH', status: 'IN_PROGRESS', assignedTo: 'Finance' } })

  // Announcements
  await db.announcement.create({ data: { title: 'New company holiday policy', content: 'We have updated the holiday policy for 2026. Please review the updated calendar. Optional holidays can now be availed with prior manager approval.', category: 'POLICY', priority: 'HIGH', authorName: 'Anil Deshmukh' } })
  await db.announcement.create({ data: { title: 'Security training due Friday', content: 'All employees must complete the mandatory security awareness training by this Friday. Certificate will be auto-generated on completion.', category: 'TRAINING', priority: 'HIGH', authorName: 'HR Team' } })
  await db.announcement.create({ data: { title: 'Monthly town hall on Friday', content: 'Join us this Friday 4 PM for the monthly town hall. Leadership will share Q3 results and Q4 roadmap.', category: 'EVENT', priority: 'MEDIUM', authorName: 'Priya Nair' } })
  await db.announcement.create({ data: { title: 'Welcome our new interns', content: 'Please welcome Siddhesh and Aisha who joined the Engineering team as interns. Wishing them a great learning journey at Strides!', category: 'GENERAL', priority: 'MEDIUM', authorName: 'HR Team' } })

  // Assets
  await db.asset.create({ data: { employeeId: intern1.id, assetId: 'STR-LAP-1024', name: 'Laptop', model: 'Dell Latitude 5430', category: 'IT', issuedAt: daysAgo(45), status: 'ACTIVE' } })
  await db.asset.create({ data: { employeeId: intern1.id, assetId: 'STR-MON-2042', name: 'Monitor', model: 'Dell 24" FHD', category: 'IT', issuedAt: daysAgo(45), status: 'ACTIVE' } })
  await db.asset.create({ data: { employeeId: emp1.id, assetId: 'STR-LAP-1010', name: 'Laptop', model: 'MacBook Pro 14', category: 'IT', issuedAt: daysAgo(420), status: 'ACTIVE' } })
  await db.asset.create({ data: { employeeId: emp2.id, assetId: 'STR-LAP-1015', name: 'Laptop', model: 'Lenovo ThinkPad T14', category: 'IT', issuedAt: daysAgo(300), status: 'ACTIVE' } })
  await db.asset.create({ data: { employeeId: manager.id, assetId: 'STR-LAP-1005', name: 'Laptop', model: 'MacBook Pro 16', category: 'IT', issuedAt: daysAgo(700), status: 'ACTIVE' } })

  // Expenses
  await db.expense.create({ data: { employeeId: emp1.id, category: 'TRAVEL', amount: 4500, description: 'Client visit Mumbai', status: 'MANAGER_APPROVED' } })
  await db.expense.create({ data: { employeeId: emp2.id, category: 'FOOD', amount: 800, description: 'Team lunch', status: 'PENDING' } })
  await db.expense.create({ data: { employeeId: manager.id, category: 'CLIENT', amount: 12000, description: 'Client dinner', status: 'FINANCE_APPROVED' } })

  // Notifications
  const notifs = [
    [intern1.id, 'Task deadline tomorrow', 'Attendance check-in API is due tomorrow', 'DEADLINE'],
    [intern1.id, 'Leave approved', 'Your casual leave for next week is pending approval', 'LEAVE'],
    [intern1.id, 'New company announcement', 'New holiday policy published', 'ANNOUNCEMENT'],
    [intern1.id, 'New task assigned', 'AI assistant integration assigned to you', 'TASK'],
    [intern1.id, 'Training due', 'Security training due Friday', 'INFO'],
    [intern1.id, 'IT request updated', 'Your laptop ticket is now In Progress', 'REQUEST'],
    [emp1.id, 'Performance review available', 'Your Q3 review is ready to view', 'PERFORMANCE'],
    [emp1.id, 'Leave approved', 'Your sick leave was approved', 'LEAVE'],
  ] as const
  for (const [eid, title, msg, type] of notifs) {
    await db.notification.create({ data: { employeeId: eid, title, message: msg, type, read: Math.random() > 0.5 } })
  }

  // Audit logs
  await db.auditLog.create({ data: { employeeId: manager.id, actorName: 'Priya Nair', action: 'APPROVE_LEAVE', entity: 'LeaveRequest', entityId: 'lr-1', details: 'Approved sick leave for Rahul Sharma' } })
  await db.auditLog.create({ data: { employeeId: manager.id, actorName: 'Priya Nair', action: 'ASSIGN_TASK', entity: 'Task', entityId: 'task-1', details: 'Assigned AI assistant integration to Siddhesh Patil' } })
  await db.auditLog.create({ data: { employeeId: hrEmp.id, actorName: 'Anil Deshmukh', action: 'PUBLISH_ANNOUNCEMENT', entity: 'Announcement', entityId: 'an-1', details: 'Published holiday policy update' } })

  // Onboarding tasks for interns (in-progress onboarding)
  const onboardingSteps = [
    ['Complete employee profile', 'GENERAL', 'Fill in your personal, emergency & professional details', 0],
    ['Submit ID proof & documents', 'DOCUMENTS', 'Upload Aadhaar, PAN, and passport-size photo', 1],
    ['Sign offer letter & NDA', 'DOCUMENTS', 'Review and sign your offer letter and NDA', 2],
    ['IT account setup', 'IT', 'Get your email, Slack, and portal access configured', 3],
    ['Laptop & asset allocation', 'IT', 'Receive your laptop, monitor, and ID card', 4],
    ['HR induction session', 'HR', 'Attend the HR induction covering policies & benefits', 5],
    ['Security & compliance training', 'TRAINING', 'Complete mandatory security awareness training', 6],
    ['Meet your manager & team', 'INTRO', 'Introductory meeting with Priya and the Platform team', 7],
    ['Development environment setup', 'IT', 'Set up Node.js, Git, and access to code repositories', 8],
    ['First project assignment', 'GENERAL', 'Get assigned to your first project task', 9],
  ] as const

  for (const e of [intern1, intern2]) {
    for (let i = 0; i < onboardingSteps.length; i++) {
      const [title, category, description, order] = onboardingSteps[i]
      // Mark first 4 as completed for intern1 (in-progress), first 2 for intern2
      const completed = e === intern1 ? i < 4 : i < 2
      await db.onboardingTask.create({
        data: {
          employeeId: e.id, title, category, description, order: order as number,
          completed,
          completedAt: completed ? daysAgo(30 - i) : null,
          dueDate: daysAhead(7 + i),
        },
      })
    }
  }

  // Travel requests
  await db.travelRequest.create({ data: { employeeId: emp1.id, type: 'CLIENT_VISIT', destination: 'Mumbai', purpose: 'Client demo and requirements gathering', startDate: daysAhead(7), endDate: daysAhead(9), transport: 'FLIGHT', accommodation: true, advanceAmount: 8000, status: 'PENDING' } })
  await db.travelRequest.create({ data: { employeeId: emp2.id, type: 'TRAINING', destination: 'Pune', purpose: 'AWS certification training', startDate: daysAhead(14), endDate: daysAhead(16), transport: 'TRAIN', accommodation: false, advanceAmount: 3000, status: 'MANAGER_APPROVED', approverId: manager.id, decidedAt: daysAgo(1) } })
  await db.travelRequest.create({ data: { employeeId: manager.id, type: 'BUSINESS', destination: 'Bengaluru', purpose: 'Quarterly leadership summit', startDate: daysAhead(20), endDate: daysAhead(22), transport: 'FLIGHT', accommodation: true, advanceAmount: 15000, status: 'BOOKED', approverId: manager.id, decidedAt: daysAgo(3) } })
  await db.travelRequest.create({ data: { employeeId: intern1.id, type: 'CONFERENCE', destination: 'Hyderabad', purpose: 'React India conference', startDate: daysAgo(5), endDate: daysAgo(3), transport: 'TRAIN', accommodation: true, advanceAmount: 5000, status: 'COMPLETED', approverId: manager.id, decidedAt: daysAgo(10) } })

  // Offboarding — one in progress
  await db.offboarding.create({
    data: {
      employeeId: intern2.id, type: 'CONTRACT_END', reason: 'Internship contract ending — exploring full-time conversion',
      lastWorkingDay: daysAhead(30), status: 'HR_PROCESSING',
    },
  })

  // Meetings — today's schedule + upcoming
  const todayMeetings = [
    ['Team Stand-up', 'Daily sync', atTime(today, 9, 30), atTime(today, 9, 45), 'STANDUP', `${manager.id},${emp1.id},${emp2.id},${intern1.id},${intern2.id}`],
    ['Project Meeting', 'STRIDES ONE sprint review', atTime(today, 11, 0), atTime(today, 12, 0), 'REVIEW', `${manager.id},${emp1.id},${intern1.id}`],
    ['Training Session', 'Security awareness training', atTime(today, 14, 0), atTime(today, 15, 30), 'TRAINING', `${intern1.id},${intern2.id},${emp1.id},${emp2.id}`],
    ['1:1 with Manager', 'Monthly check-in', atTime(today, 16, 0), atTime(today, 16, 30), 'MEETING', `${intern1.id}`],
    ['End of Day Wrap', 'Wrap up & log hours', atTime(today, 17, 30), atTime(today, 17, 45), 'OTHER', `${manager.id},${emp1.id},${emp2.id},${intern1.id},${intern2.id}`],
  ] as const
  for (const [title, desc, start, end, type, attendees] of todayMeetings) {
    await db.meeting.create({
      data: {
        title, description: desc, organizerId: manager.id,
        attendeeIds: attendees as string,
        startTime: start as Date, endTime: end as Date,
        location: type === 'STANDUP' ? 'Room A' : 'Zoom', type: type as string, status: 'SCHEDULED',
      },
    })
  }
  // A couple upcoming meetings tomorrow
  await db.meeting.create({
    data: {
      title: 'Sprint Planning', description: 'Plan next sprint', organizerId: manager.id,
      attendeeIds: `${manager.id},${emp1.id},${emp2.id},${intern1.id}`,
      startTime: atTime(daysAhead(1), 10, 0), endTime: atTime(daysAhead(1), 11, 30),
      location: 'Room B', type: 'MEETING', status: 'SCHEDULED',
    },
  })
  await db.meeting.create({
    data: {
      title: 'Intern Feedback Session', description: 'Monthly intern feedback', organizerId: manager.id,
      attendeeIds: `${intern1.id},${intern2.id}`,
      startTime: atTime(daysAhead(2), 15, 0), endTime: atTime(daysAhead(2), 15, 45),
      location: 'Room C', type: 'MEETING', status: 'SCHEDULED',
    },
  })

  // Intern Batch
  const batch1 = await db.internBatch.create({
    data: {
      name: 'Autumn 2026', program: 'Software Engineering Internship',
      department: 'Engineering', startDate: daysAgo(45), endDate: daysAhead(45),
      capacity: 10, managerId: manager.id, mentorIds: `${emp1.id},${emp2.id}`,
      status: 'ACTIVE',
    },
  })
  // Assign interns to batch
  await db.employee.update({ where: { id: intern1.id }, data: { batchId: batch1.id } })
  await db.employee.update({ where: { id: intern2.id }, data: { batchId: batch1.id } })

  // Add rubric & requirements to existing tasks
  const rubric = JSON.stringify([
    { criteria: 'Code Quality', maxScore: 20 },
    { criteria: 'Correctness', maxScore: 30 },
    { criteria: 'Documentation', maxScore: 15 },
    { criteria: 'Problem Solving', maxScore: 20 },
    { criteria: 'Completeness', maxScore: 15 },
  ])
  const requirements = JSON.stringify([
    { item: 'Implementation code', required: true },
    { item: 'GitHub repository link', required: true },
    { item: 'README documentation', required: true },
    { item: 'Test cases', required: false },
    { item: 'Written explanation', required: true },
  ])
  await db.task.updateMany({ where: {}, data: { rubric, requirements } })

  // Add a submission for the "Leave workflow engine" task (already SUBMITTED status)
  const leaveTask = await db.task.findFirst({ where: { title: 'Leave workflow engine' } })
  if (leaveTask) {
    const sub = await db.taskSubmission.create({
      data: {
        taskId: leaveTask.id, employeeId: emp1.id, version: 1,
        submissionNote: 'Implemented leave workflow with manager approval, auto balance update, and notification chain. Tests passing.',
        files: 'leave-workflow.zip,leave-api.ts',
        links: 'https://github.com/strides/leave-workflow',
        status: 'SUBMITTED',
        submittedAt: daysAgo(1),
      },
    })
    // Create a review request for it (linked to the submission)
    await db.reviewRequest.create({
      data: {
        submissionId: sub.id, taskId: leaveTask.id, employeeId: emp1.id,
        reviewerId: manager.id, status: 'PENDING', priority: 'HIGH', duration: 20,
      },
    })
  }

  console.log('Seed complete. Employees:', await db.employee.count(), '| Batches:', await db.internBatch.count())
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
