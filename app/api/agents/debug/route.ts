export const runtime = 'nodejs'

import { getAgent, getAgents, buildTeamContext, sanitizeSoulForTeam } from '@/lib/agents'
import { loadRegistry } from '@/lib/agents-registry'

/**
 * Debug endpoint: shows exactly what the system prompt looks like for a given agent.
 * Usage: GET /api/agents/debug?id=clarity (or whatever the orchestrator's ID is)
 *        GET /api/agents/debug (shows all agents + registry summary)
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('id')

  const registry = loadRegistry()
  const allAgents = await getAgents()

  if (!agentId) {
    // Show registry overview
    return Response.json({
      registrySource: process.env.WORKSPACE_PATH
        ? `Workspace: ${process.env.WORKSPACE_PATH}`
        : 'Bundled fallback',
      totalAgents: registry.length,
      agents: registry.map(a => ({
        id: a.id,
        name: a.name,
        title: a.title,
        reportsTo: a.reportsTo,
        directReports: a.directReports,
        soulPath: a.soulPath,
      })),
    })
  }

  const agent = await getAgent(agentId)
  if (!agent) {
    return Response.json({ error: `Agent "${agentId}" not found` }, { status: 404 })
  }

  const hasTeam = allAgents.length > 1
  const teamContext = buildTeamContext(agent, allAgents)
  const cleanSoul = agent.soul ? sanitizeSoulForTeam(agent.soul, hasTeam) : null

  // Mirror the exact system prompt logic from app/api/chat/[id]/route.ts
  let systemPrompt: string
  if (cleanSoul && hasTeam) {
    systemPrompt = [
      '=== PERSONALITY & CHARACTER ===',
      'The section below defines your personality and workflow. It may list many specialist agents',
      'as "available" or "spawnable" — those are templates. Your PERMANENT team members are',
      'different and listed in the TEAM ROSTER section after your personality.',
      'Any claim below that "no agents are permanently assigned" or "no team exists" is OUTDATED.',
      'Ignore it. Your personality and workflow remain valid; only the team composition claims are wrong.\n',
      cleanSoul,
      '\n=== PERMANENT TEAM ROSTER (overrides any "no team" claims above) ===',
      'Unlike the spawnable specialist agents in your personality doc, the following are',
      'permanently assigned team members who are always available and report to you.\n',
      teamContext,
      '\nYou are speaking directly with Operator, your operator. Stay fully in character. Be concise — this is a live chat. 2-4 sentences unless detail is asked for. No em dashes.',
    ].join('\n')
  } else if (cleanSoul) {
    systemPrompt = `${cleanSoul}\n\n${teamContext}\n\nYou are speaking directly with Operator, your operator. Stay fully in character. Be concise — this is a live chat. 2-4 sentences unless detail is asked for. No em dashes.`
  } else {
    systemPrompt = `${teamContext}\n\nYou are ${agent.name}, ${agent.title}. Respond in character. Be concise. No em dashes.`
  }

  return Response.json({
    agentId: agent.id,
    name: agent.name,
    reportsTo: agent.reportsTo,
    directReports: agent.directReports,
    hasSoul: !!agent.soul,
    soulLength: agent.soul?.length ?? 0,
    hasTeam,
    teamContextLength: teamContext.length,
    // Show the actual content so we can see what's happening
    rawSoulFirst500: agent.soul?.slice(0, 500) ?? null,
    sanitizedSoulFirst500: cleanSoul?.slice(0, 500) ?? null,
    teamContext,
    fullSystemPrompt: systemPrompt,
  })
}
