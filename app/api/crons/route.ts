import { getCrons } from '@/lib/crons'
import { loadPipelines } from '@/lib/cron-pipelines.server'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch } from '@/lib/server-cache'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await getOrFetch('crons', async () => {
      const crons = await getCrons()
      const pipelines = loadPipelines()
      return { crons, pipelines }
    }, 30_000)
    return NextResponse.json(data)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load cron jobs')
  }
}
