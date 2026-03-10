import { NextResponse } from 'next/server'
import { getBudget, setBudget, checkBudget, removeBudget } from '@/lib/budgets'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const budget = getBudget(agentId)
    const check = checkBudget(agentId)
    return NextResponse.json({ budget, check })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load budget')
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const body = await request.json()
    const budget = setBudget(agentId, body.monthlyLimitCents ?? null)
    return NextResponse.json(budget)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update budget')
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    removeBudget(agentId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to remove budget')
  }
}
