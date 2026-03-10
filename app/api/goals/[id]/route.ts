import { NextResponse } from 'next/server'
import { getGoal, updateGoal, deleteGoal } from '@/lib/goals'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const goal = getGoal(id)
    if (!goal) {
      return apiErrorResponse(new Error('Goal not found'), 'Goal not found', 404)
    }
    return NextResponse.json(goal)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load goal')
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const goal = updateGoal(id, {
      title: body.title,
      description: body.description,
      type: body.type,
      parentGoalId: body.parentGoalId,
      ownerAgentId: body.ownerAgentId,
      productId: body.productId,
      status: body.status,
      targetValue: body.targetValue,
      currentValue: body.currentValue,
      targetDate: body.targetDate,
      progress: body.progress,
    })
    if (!goal) {
      return apiErrorResponse(new Error('Goal not found'), 'Goal not found', 404)
    }
    logAudit({ actorType: 'operator', action: 'goal.updated', entityType: 'goal', entityId: id, details: body })
    return NextResponse.json(goal)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update goal')
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = deleteGoal(id)
    if (!deleted) {
      return apiErrorResponse(new Error('Goal not found'), 'Goal not found', 404)
    }
    logAudit({ actorType: 'operator', action: 'goal.deleted', entityType: 'goal', entityId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to delete goal')
  }
}
