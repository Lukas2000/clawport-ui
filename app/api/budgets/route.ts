import { NextResponse } from 'next/server'
import { getBudgets, setBudget } from '@/lib/budgets'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getBudgets())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load budgets')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.agentId) {
      return apiErrorResponse(new Error('agentId is required'), 'Missing agentId', 400)
    }
    const budget = setBudget(body.agentId, body.monthlyLimitCents ?? null)
    return NextResponse.json(budget, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to set budget')
  }
}
