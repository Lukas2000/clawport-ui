import { NextResponse } from 'next/server'
import { getProjects, createProject } from '@/lib/projects'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getProjects())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load projects')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name) {
      return apiErrorResponse(new Error('Name is required'), 'Name is required', 400)
    }
    const project = createProject(body)
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create project')
  }
}
