import { NextResponse } from 'next/server'
import { getLabels, createLabel } from '@/lib/labels'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getLabels())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load labels')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name) {
      return apiErrorResponse(new Error('Name is required'), 'Name is required', 400)
    }
    const label = createLabel({ name: body.name, color: body.color })
    return NextResponse.json(label, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create label')
  }
}
