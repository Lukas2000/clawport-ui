import { NextResponse } from 'next/server'
import { listAgentConfigFiles } from '@/lib/agent-config'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const files = await listAgentConfigFiles(id)
    return NextResponse.json(files)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to list config files')
  }
}
