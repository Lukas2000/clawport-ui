import { NextResponse } from 'next/server'
import { getHeartbeatRuns } from '@/lib/heartbeat'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    return NextResponse.json(getHeartbeatRuns(agentId, limit))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load heartbeat runs')
  }
}
