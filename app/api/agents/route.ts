import { getAgents } from '@/lib/agents'
import { apiErrorResponse } from '@/lib/api-error'
import { NextResponse } from 'next/server'

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL_MS = 30_000

export async function GET() {
  try {
    const now = Date.now()
    if (cache && now - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(cache.data)
    }
    const agents = await getAgents()
    cache = { data: agents, ts: now }
    return NextResponse.json(agents)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load agents')
  }
}
