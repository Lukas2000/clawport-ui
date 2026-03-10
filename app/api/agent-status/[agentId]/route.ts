import { NextResponse } from 'next/server'
import { getAgentStatus, updateAgentStatus } from '@/lib/agent-status'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const status = getAgentStatus(agentId)
    if (!status) {
      return apiErrorResponse(new Error('Not found'), 'Agent status not found', 404)
    }
    return NextResponse.json(status)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load agent status')
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const body = await request.json()
    const status = updateAgentStatus(agentId, {
      status: body.status,
      currentTaskId: body.currentTaskId,
      lastActiveAt: body.lastActiveAt,
      lastError: body.lastError,
    })
    return NextResponse.json(status)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update agent status')
  }
}
