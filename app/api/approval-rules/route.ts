import { NextResponse } from 'next/server'
import { getApprovalRules, createApprovalRule } from '@/lib/approval-rules'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getApprovalRules())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load approval rules')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name || !body.triggerCondition) {
      return apiErrorResponse(new Error('name and triggerCondition are required'), 'Missing fields', 400)
    }
    const rule = createApprovalRule({
      name: body.name,
      triggerCondition: body.triggerCondition,
      description: body.description,
    })
    return NextResponse.json(rule, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create approval rule')
  }
}
