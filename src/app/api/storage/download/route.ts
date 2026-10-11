import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, hasMinRole } from '@/lib/api-auth'
import { getSignedUrl } from '@/lib/supabase-admin'
import { adminDb } from '@/lib/firebase-admin'

// ============================================================
// POST /api/storage/download
// Authenticated. Generates a short-lived signed URL for a private file in Supabase Storage.
// Body: { path, taskId?, submissionId? }
// Verifies the caller is authorized to access this file:
//   - User-scoped paths (profiles/documents/reports/<uid>/...) — caller must own the UID
//   - task-submissions/<uid>/... — caller must be the UID owner OR the task creator/manager
// ============================================================
export async function POST(req: NextRequest) {
  const ctx = await requireAuth(req)
  if (ctx instanceof NextResponse) return ctx
  if (ctx.inactive) return NextResponse.json({ error: 'Account inactive' }, { status: 403 })

  const { path, taskId, submissionId } = await req.json()
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Authorization check
  const segments = path.split('/')
  if (segments[0] === 'task-submissions') {
    const pathUid = segments[1]
    if (pathUid !== ctx.uid) {
      // Caller is not the owner — check if they are the task creator or a manager
      const tid = taskId || segments[2] // expected pattern: task-submissions/{uid}/{taskId}/...
      if (tid) {
        const taskDoc = await adminDb.collection('tasks').doc(tid).get()
        if (taskDoc.exists) {
          const task: any = taskDoc.data()
          const isCreator = task.createdBy === ctx.uid
          const isManager = hasMinLevel(ctx)
          if (!isCreator && !isManager) {
            return NextResponse.json({ error: 'Forbidden — not authorized to access this file' }, { status: 403 })
          }
        } else {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  } else if (['profiles', 'documents', 'reports'].includes(segments[0] || '')) {
    const pathUid = segments[1]
    if (pathUid !== ctx.uid && !hasMinLevel(ctx)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const url = await getSignedUrl(path, 3600) // 1 hour expiry
    if (!url) return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
    return NextResponse.json({ url, success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function hasMinLevel(ctx: any): boolean {
  return hasMinRole(ctx.role, 'MANAGER')
}
