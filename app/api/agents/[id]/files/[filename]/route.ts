import { NextResponse } from 'next/server'
import { readAgentConfigFile, writeAgentConfigFile, deleteAgentConfigFile } from '@/lib/agent-config'
import { apiErrorResponse } from '@/lib/api-error'
import { invalidate } from '@/lib/server-cache'

type Params = Promise<{ id: string; filename: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { id, filename } = await params
    const file = await readAgentConfigFile(id, filename)
    if (!file) {
      return apiErrorResponse(new Error('File not found'), 'Config file not found', 404)
    }
    return NextResponse.json(file)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to read config file')
  }
}

export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { id, filename } = await params
    const body = await request.json()

    if (typeof body.content !== 'string') {
      return apiErrorResponse(new Error('content string required'), 'content string required', 400)
    }

    const ok = await writeAgentConfigFile(id, filename, body.content)
    if (!ok) {
      return apiErrorResponse(new Error('Failed to write'), 'Failed to write config file', 500)
    }

    invalidate('agents')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to save config file')
  }
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const { id, filename } = await params
    const ok = await deleteAgentConfigFile(id, filename)
    if (!ok) {
      return apiErrorResponse(
        new Error('Cannot revert this file'),
        'Cannot revert this file (SOUL.md cannot be reverted)',
        400
      )
    }

    invalidate('agents')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to revert config file')
  }
}
