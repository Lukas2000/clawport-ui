import { getAgents } from '@/lib/agents'
import { createAgent } from '@/lib/agent-crud'
import { syncTeamToSouls } from '@/lib/team-sync'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch, invalidate } from '@/lib/server-cache'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const agents = await getOrFetch('agents', () => getAgents(), 60_000)
    // Fire-and-forget: sync team roster into SOUL.md files on disk so
    // Telegram, CLI, and other OpenClaw channels see the current team.
    // This runs on every load but is fast (skips writes when unchanged).
    syncTeamToSouls().catch(() => {})
    return NextResponse.json(agents)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load agents')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      return apiErrorResponse(new Error('name is required'), 'name is required', 400)
    }

    const agent = createAgent({
      name: body.name,
      title: body.title || 'Agent',
      emoji: body.emoji || body.name.charAt(0).toUpperCase(),
      color: body.color || '#3b82f6',
      reportsTo: body.reportsTo ?? null,
      tools: Array.isArray(body.tools) ? body.tools : ['read', 'write'],
      description: body.description || `${body.name} agent.`,
      soulContent: body.soulContent,
      templateRef: body.templateRef,
    })

    invalidate('agents')
    return NextResponse.json(agent, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create agent')
  }
}
