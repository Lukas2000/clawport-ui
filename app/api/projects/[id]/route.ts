import { NextResponse } from 'next/server'
import { getProject, updateProject, deleteProject } from '@/lib/projects'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = getProject(id)
    if (!project) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json(project)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load project')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const project = updateProject(id, body)
    if (!project) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json(project)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update project')
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ok = deleteProject(id)
    if (!ok) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to delete project')
  }
}
