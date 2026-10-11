import { db } from '@/lib/db'

// Create a notification for an employee. Non-blocking — errors are swallowed.
export async function notify(
  employeeId: string,
  title: string,
  message: string,
  type: string = 'INFO',
  link: string = ''
) {
  try {
    await db.notification.create({
      data: { employeeId, title, message, type, link, read: false },
    })
  } catch (e) {
    // swallow — notifications are best-effort
  }
}

// Notify the manager of an employee (if they have one)
export async function notifyManager(
  employeeId: string,
  title: string,
  message: string,
  type: string = 'INFO',
  link: string = ''
) {
  try {
    const emp = await db.employee.findUnique({ where: { id: employeeId }, select: { managerId: true, name: true } })
    if (emp?.managerId) {
      await notify(emp.managerId, title, message, type, link)
    }
  } catch (e) {
    // swallow
  }
}
