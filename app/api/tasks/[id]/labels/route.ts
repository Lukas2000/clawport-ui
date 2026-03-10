import { NextResponse } from 'next/server'
import { getTaskLabels, addLabelToTask, removeLabelFromTask } from '@/lib/labels'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    return NextResponse.json(getTaskLabels(id))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load task labels')
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.labelId) {
      return apiErrorResponse(new Error('labelId is required'), 'labelId is required', 400)
    }
    addLabelToTask(id, body.labelId)
    return NextResponse.json(getTaskLabels(id))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to add label')
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const labelId = url.searchParams.get('label_id')
    if (!labelId) {
      return apiErrorResponse(new Error('label_id is required'), 'label_id query param is required', 400)
    }
    removeLabelFromTask(id, labelId)
    return NextResponse.json(getTaskLabels(id))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to remove label')
  }
}
