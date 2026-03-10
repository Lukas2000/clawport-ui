import { NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/tasks'
import { getProject } from '@/lib/projects'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const filters = {
      agentId: url.searchParams.get('agent_id') ?? undefined,
      projectId: url.searchParams.get('project_id') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      priority: url.searchParams.get('priority') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      excludeHidden: url.searchParams.get('exclude_hidden') !== 'false',
    }
    return NextResponse.json(getTasks(filters))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load tasks')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.title) {
      return apiErrorResponse(new Error('Title is required'), 'Title is required', 400)
    }

    // Auto-assign to project PM agent if no assignee specified
    if (body.projectId && !body.assignedAgentId) {
      const project = getProject(body.projectId)
      if (project?.leadAgentId) {
        body.assignedAgentId = project.leadAgentId
      }
    }

    const task = createTask(body)
    logAudit({
      actorType: 'operator',
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      details: { title: task.title, projectId: task.projectId, assignedAgentId: task.assignedAgentId },
    })
    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create task')
  }
}
