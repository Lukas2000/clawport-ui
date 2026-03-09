import { getCronRuns } from '@/lib/cron-runs'
import { computeCostSummary } from '@/lib/costs'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch } from '@/lib/server-cache'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const summary = await getOrFetch('costs', async () => {
      const runs = getCronRuns()
      return computeCostSummary(runs)
    }, 20_000)
    return NextResponse.json(summary)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to compute costs')
  }
}
