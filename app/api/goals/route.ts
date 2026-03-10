import { NextResponse } from 'next/server'
import { getGoals, createGoal } from '@/lib/goals'
import { apiErrorResponse } from '@/lib/api-error'
import type { GoalStatus, GoalType } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as GoalStatus | null
    const ownerAgentId = searchParams.get('owner_agent_id')
    const parentGoalId = searchParams.get('parent_goal_id')
    const type = searchParams.get('type') as GoalType | null

    const filters: Record<string, unknown> = {}
    if (status) filters.status = status
    if (ownerAgentId) filters.ownerAgentId = ownerAgentId
    if (parentGoalId !== null && parentGoalId !== undefined) {
      filters.parentGoalId = parentGoalId === 'null' ? null : parentGoalId
    }
    if (type) filters.type = type

    return NextResponse.json(getGoals(Object.keys(filters).length > 0 ? filters as never : undefined))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load goals')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.title) {
      return apiErrorResponse(new Error('Title is required'), 'Title is required', 400)
    }
    const goal = createGoal({
      title: body.title,
      description: body.description,
      type: body.type,
      parentGoalId: body.parentGoalId,
      ownerAgentId: body.ownerAgentId,
      targetValue: body.targetValue,
      targetDate: body.targetDate,
    })
    return NextResponse.json(goal, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create goal')
  }
}
