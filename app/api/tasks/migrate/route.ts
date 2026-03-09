import { NextResponse } from 'next/server'
import { migrateTasks } from '@/lib/tasks'
import { apiErrorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!Array.isArray(body.tickets)) {
      return apiErrorResponse(new Error('tickets array required'), 'tickets array required', 400)
    }
    const count = migrateTasks(body.tickets)
    return NextResponse.json({ migrated: count })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to migrate tasks')
  }
}
