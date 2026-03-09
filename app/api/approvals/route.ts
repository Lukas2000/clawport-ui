import { NextResponse } from 'next/server'
import { getApprovals, createApproval } from '@/lib/approvals'
import { apiErrorResponse } from '@/lib/api-error'
import type { ApprovalStatus } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as ApprovalStatus | null
    return NextResponse.json(getApprovals(status ?? undefined))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load approvals')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.title) {
      return apiErrorResponse(new Error('Title is required'), 'Title is required', 400)
    }
    const approval = createApproval(body)
    return NextResponse.json(approval, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create approval')
  }
}
