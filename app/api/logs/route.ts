import { getLogEntries, computeLogSummary } from '@/lib/logs'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch } from '@/lib/server-cache'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source') ?? undefined
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const cacheKey = `logs:${source ?? 'all'}:${limit ?? 'default'}`
    const data = await getOrFetch(cacheKey, async () => {
      const entries = getLogEntries({ source, limit })
      const summary = computeLogSummary(entries)
      return { entries, summary }
    }, 15_000)

    return NextResponse.json(data)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load logs')
  }
}
