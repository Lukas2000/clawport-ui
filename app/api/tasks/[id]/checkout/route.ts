import { NextResponse } from 'next/server'
import { checkoutTask, releaseCheckout } from '@/lib/tasks'
import { apiErrorResponse } from '@/lib/api-error'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.agentId) {
      return apiErrorResponse(new Error('agentId is required'), 'agentId is required', 400)
    }
    const result = checkoutTask(id, body.agentId)
    if (!result.success) {
      return NextResponse.json(result, { status: 409 })
    }
    return NextResponse.json(result)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to checkout task')
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const agentId = url.searchParams.get('agent_id')
    const result = releaseCheckout(id, agentId)
    if (!result.success) {
      return NextResponse.json(result, { status: 409 })
    }
    return NextResponse.json(result)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to release checkout')
  }
}
