import { getAgents } from '@/lib/agents'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch } from '@/lib/server-cache'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const agents = await getOrFetch('agents', () => getAgents(), 60_000)
    return NextResponse.json(agents)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load agents')
  }
}
