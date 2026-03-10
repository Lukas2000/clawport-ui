import { NextResponse } from 'next/server'
import { decideApproval } from '@/lib/approvals'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.status || !['approved', 'rejected', 'revision_requested'].includes(body.status)) {
      return apiErrorResponse(
        new Error('status must be approved, rejected, or revision_requested'),
        'Invalid status',
        400
      )
    }
    const approval = decideApproval(id, body.status, body.decisionNote, body.decidedBy)
    if (!approval) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    logAudit({
      actorType: 'operator',
      actorId: body.decidedBy ?? null,
      action: `approval.${body.status}`,
      entityType: 'approval',
      entityId: id,
      details: { note: body.decisionNote ?? null },
    })
    return NextResponse.json(approval)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update approval')
  }
}
