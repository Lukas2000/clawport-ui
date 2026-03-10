import { NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/tasks'
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
    const task = createTask(body)
    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create task')
  }
}
