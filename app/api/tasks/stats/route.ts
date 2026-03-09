import { NextResponse } from 'next/server'
import { getTaskStats } from '@/lib/tasks'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getTaskStats())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load task stats')
  }
}
