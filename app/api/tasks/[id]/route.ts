import { NextResponse } from 'next/server'
import { getTask, updateTask, deleteTask, getTasks } from '@/lib/tasks'
import { getProject, updateProject } from '@/lib/projects'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

/** Recompute a project's progress as done_count / total_count * 100 */
function syncProjectProgress(projectId: string) {
  try {
    const tasks = getTasks({ projectId, excludeHidden: true })
    if (tasks.length === 0) return
    const done = tasks.filter(t => t.status === 'done').length
    const progress = Math.round((done / tasks.length) * 100)
    updateProject(projectId, { progress })
  } catch {
    // non-critical
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const task = getTask(id)
    if (!task) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json(task)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load task')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const before = getTask(id)
    const task = updateTask(id, body)
    if (!task) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    logAudit({ actorType: 'operator', action: 'task.updated', entityType: 'task', entityId: id, details: body })

    // Sync project progress whenever a task's status changes
    if (body.status !== undefined && body.status !== before?.status && task.projectId) {
      syncProjectProgress(task.projectId)
    }

    return NextResponse.json(task)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update task')
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const task = getTask(id)
    const ok = deleteTask(id)
    if (!ok) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    logAudit({ actorType: 'operator', action: 'task.deleted', entityType: 'task', entityId: id })

    // Sync project progress after deletion
    if (task?.projectId) {
      syncProjectProgress(task.projectId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to delete task')
  }
}
