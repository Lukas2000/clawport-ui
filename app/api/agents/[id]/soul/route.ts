import { NextResponse } from 'next/server'
import { getAgents } from '@/lib/agents'
import { readAgentMd, writeAgentMd } from '@/lib/agent-editor'
import { apiErrorResponse } from '@/lib/api-error'

async function findAgent(id: string) {
  const agents = await getAgents()
  return agents.find((a) => a.id === id)
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const agent = await findAgent(id)
    if (!agent) return apiErrorResponse(new Error('Agent not found'), 'Agent not found', 404)
    if (!agent.soulPath) return apiErrorResponse(new Error('No SOUL.md path'), 'No SOUL.md path', 404)

    const result = readAgentMd(agent.soulPath)
    if (!result) return apiErrorResponse(new Error('Could not read SOUL.md'), 'Could not read SOUL.md', 404)
    return NextResponse.json(result)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to read SOUL.md')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const agent = await findAgent(id)
    if (!agent) return apiErrorResponse(new Error('Agent not found'), 'Agent not found', 404)
    if (!agent.soulPath) return apiErrorResponse(new Error('No SOUL.md path'), 'No SOUL.md path', 404)

    const body = await request.json()
    if (typeof body.content !== 'string') {
      return apiErrorResponse(new Error('content string required'), 'content string required', 400)
    }

    const ok = writeAgentMd(agent.soulPath, body.content)
    if (!ok) return apiErrorResponse(new Error('Failed to write'), 'Failed to write', 500)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to save SOUL.md')
  }
}
