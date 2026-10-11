import { NextResponse } from 'next/server'

const FAQ_CATEGORIES = [
  {
    category: 'Getting Started', icon: '🚀',
    questions: [
      { q: 'How do I check in for attendance?', a: 'Go to the Attendance module from the sidebar. Click "Check In" when you arrive. Click "Check Out" before leaving.' },
      { q: 'How do I apply for leave?', a: 'Navigate to Leave > Apply Leave. Select leave type, pick dates, add a reason, and submit.' },
      { q: 'What is the Cmd+K shortcut?', a: 'Cmd+K opens the Command Palette for quick navigation.' },
    ],
  },
  {
    category: 'Tasks & Projects', icon: '✅',
    questions: [
      { q: 'How does the task Kanban board work?', a: 'Tasks move through 7 stages: To Do → Assigned → In Progress → Submitted → Under Review → Approved → Completed.' },
      { q: 'What is AI Task Evaluation?', a: 'When you submit a task, your manager can run an AI review for a preliminary score with strengths and weaknesses.' },
      { q: 'How do I submit my work on a task?', a: 'Open the task detail, write a submission note, add files/links, then click "Submit for Review".' },
    ],
  },
  {
    category: 'Leave & Attendance', icon: '🏖️',
    questions: [
      { q: 'What are the leave types and balances?', a: 'Casual: 12 days/year, Sick: 12 days/year, Earned: 15 days/year.' },
      { q: 'How is attendance percentage calculated?', a: '(Present + Late days) / Total working days, excluding weekends and holidays.' },
    ],
  },
  {
    category: 'HR & Requests', icon: '🎫',
    questions: [
      { q: 'How do I raise an IT/HR request?', a: 'Go to Service Requests > Raise Request. Choose a category and describe your issue.' },
      { q: 'How do expense reimbursements work?', a: 'Submit via Expenses > New Expense. Workflow: Pending → Manager Approved → Finance Approved → Processed.' },
    ],
  },
  {
    category: 'AI Assistant', icon: '🤖',
    questions: [
      { q: 'What can the AI Assistant do?', a: 'Answer questions about your tasks, leave, performance, goals, and company policies.' },
      { q: 'Is the AI always accurate?', a: 'AI responses may contain inaccuracies. Verify critical information.' },
    ],
  },
]

export async function GET() { return NextResponse.json(FAQ_CATEGORIES) }
export { FAQ_CATEGORIES }
