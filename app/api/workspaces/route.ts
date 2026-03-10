import { NextResponse } from 'next/server'
import { getProfiles, addProfile, removeProfile, getCurrentWorkspacePath } from '@/lib/workspace-profiles'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    const profiles = getProfiles()
    const currentPath = getCurrentWorkspacePath()
    return NextResponse.json({ profiles, currentPath })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load workspace profiles')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name || !body.path) {
      return apiErrorResponse(new Error('name and path are required'), 'Missing fields', 400)
    }
    const profile = addProfile(body.name, body.path)
    return NextResponse.json(profile, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to add workspace profile')
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    if (!body.id) {
      return apiErrorResponse(new Error('id is required'), 'Missing id', 400)
    }
    const removed = removeProfile(body.id)
    if (!removed) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to remove workspace profile')
  }
}
