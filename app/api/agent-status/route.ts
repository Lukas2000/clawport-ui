import { NextResponse } from 'next/server'
import { getAgentStatuses } from '@/lib/agent-status'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getAgentStatuses())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load agent statuses')
  }
}
