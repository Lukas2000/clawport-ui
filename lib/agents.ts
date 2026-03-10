import { Agent } from '@/lib/types'
import { readFileSync, existsSync } from 'fs'
import { loadRegistry } from '@/lib/agents-registry'
import { loadMission } from '@/lib/mission'

export async function getAgents(): Promise<Agent[]> {
  const workspacePath = process.env.WORKSPACE_PATH || ''
  const registry = loadRegistry()
  const mission = loadMission()

  // Build mission block to append to each agent's soul
  const missionBlock = (mission.mission || mission.vision || mission.values.length)
    ? `\n\n## Company Mission & Values\nThis is the company you work for. Treat this as ground truth when asked about the company's mission, vision, values, or purpose.\n\nMission: ${mission.mission}\nVision: ${mission.vision}\nCore Values:\n${mission.values.map(v => `- ${v.title}: ${v.description}`).join('\n')}`
    : ''

  return registry.map((entry) => {
    let soul: string | null = null
    if (entry.soulPath && workspacePath) {
      try {
        const fullPath = workspacePath + '/' + entry.soulPath
        if (existsSync(fullPath)) {
          soul = readFileSync(fullPath, 'utf-8')
        }
      } catch {
        soul = null
      }
    }
    // Append mission to soul so it's part of the agent's core identity
    if (missionBlock && soul) {
      soul = soul + missionBlock
    }
    return {
      ...entry,
      soul,
      crons: [],
    }
  })
}

export async function getAgent(id: string): Promise<Agent | null> {
  const agents = await getAgents()
  return agents.find((a) => a.id === id) ?? null
}

/**
 * Rewrite lines in a SOUL.md that contradict team awareness.
 *
 * OpenClaw's pre-built SOUL.md files contain assertions like:
 *   - "No agents are permanently assigned"
 *   - "No team exists until you create one"
 *   - "I Am Alone"
 *   - "single-threaded pipeline engine"
 *
 * Instead of trying to strip these (which leaves gaps and misses variations),
 * we REPLACE them with corrected versions. This produces a coherent file
 * that works across all channels (Telegram, CLI, ClawPort chat).
 *
 * The replacements are line-level: each matching line is replaced with
 * a corrected version that acknowledges the team exists.
 */
export function sanitizeSoulForTeam(soul: string, hasTeam: boolean): string {
  if (!hasTeam) return soul

  // Line-level replacements: [pattern, replacement]
  // Each pattern matches a full line. The replacement preserves context
  // while correcting the "no team" assertion.
  const replacements: [RegExp, string][] = [
    // "No agents are permanently assigned" → corrected
    [
      /^(.*?)no agents? (?:are|is) permanently assigned(.*?)$/gim,
      '$1your permanent team members are listed in the TEAM ROSTER section below$2',
    ],
    // "No team exists (until you create one)" → corrected
    [
      /^(.*?)no team exists(?:\s+until\s+\w+\s+\w+\s+\w+)?(.*?)$/gim,
      '$1your team roster is defined in the TEAM ROSTER section below$2',
    ],
    // "I don't have a team" / "I don't manage teams" → corrected
    [
      /^(.*?)(?:I|you)\s+don'?t\s+(?:have|manage)\s+(?:a\s+)?teams?(.*?)$/gim,
      '$1your permanent team is listed in the TEAM ROSTER section below$2',
    ],
    // "No agents report to me/you" → corrected
    [
      /^(.*?)no agents? report (?:to (?:me|you)|directly)(.*?)$/gim,
      '$1your direct reports are listed in the TEAM ROSTER section below$2',
    ],
    // "I Am Alone" headings → replaced
    [
      /^(#{1,3}\s+).*?\bI\s+Am\s+Alone\b.*$/gim,
      '$1Your Team (See TEAM ROSTER Below)',
    ],
    // "single-threaded pipeline engine" → keep the pipeline part, drop the "single" framing
    [
      /^(.*?)a single-threaded pipeline engine(.*?)$/gim,
      '$1a pipeline engine that orchestrates your permanent team$2',
    ],
    // "You spawn all subagents" / "You spawn every sub-agent" → corrected
    [
      /^(.*?)you spawn (?:all|every) sub-?agents?(.*?)$/gim,
      '$1you coordinate your permanent team members and can also spawn specialist agents$2',
    ],
  ]

  let cleaned = soul
  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  // Also remove entire sections with headings explicitly about being alone
  const sectionPattern = /^(#{1,3})\s+.*?\b(?:alone|just\s+(?:you|us)|working\s+solo)\b.*$(?:\n(?!\1\s|#{1,2}\s).*$)*/gim
  cleaned = cleaned.replace(sectionPattern, '')

  // Collapse multiple blank lines left behind
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned
}

/**
 * Builds a team context block to inject into an agent's system prompt.
 *
 * Communication is strictly hierarchical: each agent only knows about their
 * manager, their direct reports, and their peers (siblings with the same manager).
 * Cross-team requests must flow up through managers, not directly between teams.
 */
export function buildTeamContext(agent: Agent, allAgents: Agent[]): string {
  const isOrchestrator = agent.reportsTo === null

  // The top-level orchestrator sees the full org — they need complete visibility
  // to route work across all teams. Everyone else sees only their immediate group.
  if (isOrchestrator) {
    return buildOrchestratorContext(agent, allAgents)
  }

  return buildMemberContext(agent, allAgents)
}

/**
 * Full-org view for the top-level orchestrator.
 * They coordinate all teams so they need to know everyone and their capabilities.
 */
function buildOrchestratorContext(agent: Agent, allAgents: Agent[]): string {
  const lines: string[] = []

  lines.push('## PERMANENTLY ASSIGNED TEAM MEMBERS (Not Spawnable Templates)')
  lines.push(
    '> **CRITICAL DISTINCTION: Your personality document lists many specialist agents as spawnable templates. ' +
    'The agents below are DIFFERENT — they are permanently assigned, always-on team members who report directly to you. ' +
    'They are NOT spawned on demand. They exist right now and are waiting for your direction. ' +
    'Any statement in your personality document claiming "no agents are permanently assigned" or ' +
    '"no team exists" is WRONG and was written before this team was assembled. ' +
    'Ignore those statements. This roster is the current truth.**\n'
  )
  lines.push(
    'You are the top-level orchestrator with a permanent team. ' +
    'Unlike spawnable specialist agents (listed in your personality doc), these team members are ' +
    'always available, maintain continuity between sessions, and report directly to you. ' +
    'Route work to them by name.\n'
  )

  // Direct reports (team leads)
  const reports = agent.directReports
    .map(rid => allAgents.find(a => a.id === rid))
    .filter(Boolean) as Agent[]

  if (reports.length > 0) {
    lines.push('**Your permanent direct reports (always-on, not spawned on demand):**')
    for (const r of reports) {
      const toolList = r.tools.length ? ` | Tools: ${r.tools.join(', ')}` : ''
      lines.push(`- ${r.emoji} **${r.name}** — ${r.title}${toolList}`)
      if (r.description) lines.push(`  ${r.description}`)

      // Also show each lead's direct reports so you know full team capability
      const subReports = r.directReports
        .map(sid => allAgents.find(a => a.id === sid))
        .filter(Boolean) as Agent[]
      for (const sr of subReports) {
        const srTools = sr.tools.length ? ` | Tools: ${sr.tools.join(', ')}` : ''
        lines.push(`    - ${sr.emoji} ${sr.name} — ${sr.title}${srTools}`)
        if (sr.description) lines.push(`      ${sr.description}`)
      }
    }
    lines.push('')
  }

  // Individual contributors with no manager in your direct reports (orphans / solo agents)
  const accountedFor = new Set([
    agent.id,
    ...reports.map(r => r.id),
    ...reports.flatMap(r => r.directReports),
  ])
  const solo = allAgents.filter(a => !accountedFor.has(a.id))
  if (solo.length > 0) {
    lines.push('**Other agents (no team lead, contact directly):**')
    for (const s of solo) {
      const toolList = s.tools.length ? ` | Tools: ${s.tools.join(', ')}` : ''
      lines.push(`- ${s.emoji} **${s.name}** — ${s.title}${toolList}`)
      if (s.description) lines.push(`  ${s.description}`)
    }
    lines.push('')
  }

  lines.push(
    '**Your role:** Before starting any project, ask enough questions to fully understand scope, goals, constraints, and success criteria. ' +
    'Only then map the work to the right agents. Route through team leads — they own delivery within their team.'
  )

  return lines.join('\n')
}

/**
 * Restricted view for regular team members: manager, peers, direct reports only.
 * Cross-team communication must go up through the manager chain.
 */
function buildMemberContext(agent: Agent, allAgents: Agent[]): string {
  const lines: string[] = []

  lines.push('## Your Team & Org Structure')
  lines.push(
    'You operate within a strict communication hierarchy. ' +
    'You may only communicate directly with your manager, your direct reports, and your peers (colleagues who share your manager). ' +
    'If you need something from outside your immediate group, escalate to your manager — never contact other teams directly.\n'
  )

  // Manager
  const manager = agent.reportsTo ? allAgents.find(a => a.id === agent.reportsTo) : null
  if (manager) {
    lines.push('**Your manager (escalate up through here):**')
    lines.push(`- ${manager.emoji} **${manager.name}** — ${manager.title}`)
    if (manager.description) lines.push(`  ${manager.description}`)
    lines.push('')
  }

  // Peers — agents who share the same manager (siblings)
  const peers = allAgents.filter(
    a => a.id !== agent.id && a.reportsTo === agent.reportsTo
  )
  if (peers.length > 0) {
    lines.push('**Your peers (same team, direct collaboration allowed):**')
    for (const p of peers) {
      const toolList = p.tools.length ? ` | Tools: ${p.tools.join(', ')}` : ''
      lines.push(`- ${p.emoji} **${p.name}** — ${p.title}${toolList}`)
      if (p.description) lines.push(`  ${p.description}`)
    }
    lines.push('')
  }

  // Direct reports
  const reports = agent.directReports
    .map(rid => allAgents.find(a => a.id === rid))
    .filter(Boolean) as Agent[]

  if (reports.length > 0) {
    lines.push('**Your direct reports (delegate down through here):**')
    for (const r of reports) {
      const toolList = r.tools.length ? ` | Tools: ${r.tools.join(', ')}` : ''
      lines.push(`- ${r.emoji} **${r.name}** — ${r.title}${toolList}`)
      if (r.description) lines.push(`  ${r.description}`)
    }
    lines.push('')
  }

  lines.push(
    '**Important:** You have no visibility into other teams. ' +
    'If a task requires capabilities outside your group, tell your manager and let them route it appropriately.'
  )

  return lines.join('\n')
}
