import { NextResponse } from 'next/server'
import { decideApproval } from '@/lib/approvals'
import { apiErrorResponse } from '@/lib/api-error'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.status || !['approved', 'rejected'].includes(body.status)) {
      return apiErrorResponse(
        new Error('status must be approved or rejected'),
        'status must be approved or rejected',
        400
      )
    }
    const approval = decideApproval(id, body.status, body.decisionNote)
    if (!approval) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json(approval)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update approval')
  }
}
