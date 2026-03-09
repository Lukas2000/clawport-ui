import { NextResponse } from 'next/server'
import { getComments, addComment } from '@/lib/task-comments'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return NextResponse.json(getComments(id))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load comments')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.content) {
      return apiErrorResponse(new Error('Content is required'), 'Content is required', 400)
    }
    const comment = addComment({
      taskId: id,
      authorType: body.authorType ?? 'operator',
      authorId: body.authorId,
      content: body.content,
    })
    return NextResponse.json(comment, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to add comment')
  }
}
