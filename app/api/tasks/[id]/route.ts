import { NextResponse } from 'next/server'
import { getTask, updateTask, deleteTask } from '@/lib/tasks'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

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
    const task = updateTask(id, body)
    if (!task) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    logAudit({ actorType: 'operator', action: 'task.updated', entityType: 'task', entityId: id, details: body })
    return NextResponse.json(task)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update task')
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ok = deleteTask(id)
    if (!ok) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    logAudit({ actorType: 'operator', action: 'task.deleted', entityType: 'task', entityId: id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to delete task')
  }
}
