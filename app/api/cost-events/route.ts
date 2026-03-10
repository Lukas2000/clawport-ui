import { NextResponse } from 'next/server'
import { getCostEvents, recordCostEvent } from '@/lib/cost-events'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters: Record<string, string | number> = {}
    if (searchParams.get('agent_id')) filters.agentId = searchParams.get('agent_id')!
    if (searchParams.get('run_id')) filters.runId = searchParams.get('run_id')!
    if (searchParams.get('task_id')) filters.taskId = searchParams.get('task_id')!
    if (searchParams.get('project_id')) filters.projectId = searchParams.get('project_id')!
    if (searchParams.get('since')) filters.since = searchParams.get('since')!
    if (searchParams.get('until')) filters.until = searchParams.get('until')!
    if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit')!, 10)

    return NextResponse.json(getCostEvents(Object.keys(filters).length > 0 ? filters as never : undefined))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load cost events')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.agentId || !body.model) {
      return apiErrorResponse(new Error('agentId and model are required'), 'Missing fields', 400)
    }
    const event = recordCostEvent({
      agentId: body.agentId,
      runId: body.runId,
      taskId: body.taskId,
      projectId: body.projectId,
      goalId: body.goalId,
      provider: body.provider,
      model: body.model,
      inputTokens: body.inputTokens ?? 0,
      outputTokens: body.outputTokens ?? 0,
      cachedInputTokens: body.cachedInputTokens ?? 0,
      costCents: body.costCents ?? 0,
    })
    return NextResponse.json(event, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to record cost event')
  }
}
