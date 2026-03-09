import { getCronRuns } from '@/lib/cron-runs'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch } from '@/lib/server-cache'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId') ?? undefined
    const cacheKey = `cron-runs:${jobId ?? 'all'}`
    const runs = await getOrFetch(cacheKey, async () => getCronRuns(jobId), 20_000)
    return NextResponse.json(runs)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load cron runs')
  }
}
