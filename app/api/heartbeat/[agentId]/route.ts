import { NextResponse } from 'next/server'
import { getHeartbeatConfig, upsertHeartbeatConfig, queueHeartbeatRun, startNextQueuedRun } from '@/lib/heartbeat'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const config = getHeartbeatConfig(agentId)
    if (!config) {
      return apiErrorResponse(new Error('Not found'), 'Heartbeat config not found', 404)
    }
    return NextResponse.json(config)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load heartbeat config')
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const body = await request.json()
    const config = upsertHeartbeatConfig(agentId, {
      enabled: body.enabled,
      intervalMinutes: body.intervalMinutes,
      maxConcurrentRuns: body.maxConcurrentRuns,
    })
    return NextResponse.json(config)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update heartbeat config')
  }
}

/**
 * POST /api/heartbeat/[agentId] -- manual wakeup trigger
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const run = queueHeartbeatRun(agentId, 'manual')
    const started = startNextQueuedRun(agentId)
    return NextResponse.json({ run, started: started?.id ?? null }, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to trigger heartbeat')
  }
}
