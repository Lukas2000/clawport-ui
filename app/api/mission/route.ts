import { NextResponse } from 'next/server'
import { loadMission, saveMission, loadUserMd } from '@/lib/mission'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch, invalidate } from '@/lib/server-cache'
import type { MissionData } from '@/lib/types'

export async function GET() {
  try {
    const data = await getOrFetch('mission', async () => {
      const mission = loadMission()
      const userMd = loadUserMd()
      return { ...mission, userMd }
    }, 120_000)
    return NextResponse.json(data)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load mission')
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as MissionData
    if (!body.mission || !body.vision || !Array.isArray(body.values)) {
      return apiErrorResponse(new Error('Invalid mission data'), 'Invalid mission data', 400)
    }
    saveMission({ mission: body.mission, vision: body.vision, values: body.values })
    invalidate('mission')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to save mission')
  }
}
