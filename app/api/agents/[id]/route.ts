import { NextResponse } from 'next/server'
import { updateAgent, deleteAgent } from '@/lib/agent-crud'
import { getAgents } from '@/lib/agents'
import { apiErrorResponse } from '@/lib/api-error'
import { invalidate } from '@/lib/server-cache'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updated = updateAgent(id, {
      name: body.name,
      title: body.title,
      emoji: body.emoji,
      color: body.color,
      tools: body.tools,
      description: body.description,
      reportsTo: body.reportsTo,
    })

    if (!updated) {
      return apiErrorResponse(new Error('Agent not found'), 'Agent not found', 404)
    }

    invalidate('agents')
    return NextResponse.json(updated)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update agent')
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check agent exists and warn about children
    const agents = await getAgents()
    const agent = agents.find((a) => a.id === id)
    if (!agent) {
      return apiErrorResponse(new Error('Agent not found'), 'Agent not found', 404)
    }

    const ok = deleteAgent(id)
    if (!ok) {
      return apiErrorResponse(new Error('Failed to delete'), 'Failed to delete agent', 500)
    }

    invalidate('agents')
    return NextResponse.json({ ok: true, orphanedChildren: agent.directReports })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to delete agent')
  }
}
