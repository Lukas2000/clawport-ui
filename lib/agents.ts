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
 * Strip sections from a soul/system prompt that contradict team awareness.
 *
 * OpenClaw's pre-built SOUL.md files often contain emphatic "I Am Alone",
 * "There is no team", or similar declarations. When ClawPort injects a live
 * team roster, these stale assertions confuse the model. This function
 * removes those contradictory sections so the roster is the single source
 * of truth.
 *
 * The patterns are intentionally broad because we don't control what OpenClaw
 * puts in SOUL.md — different versions may phrase it differently.
 */
export function sanitizeSoulForTeam(soul: string, hasTeam: boolean): string {
  if (!hasTeam) return soul

  // Remove full markdown sections (heading + all lines until the next heading)
  // that talk about being alone, having no team, working solo, etc.
  const sectionPattern = /^(#{1,3})\s+.*?\b(?:alone|no\s+team|solo|just\s+(?:you|us)|single\s+agent|without\s+(?:a\s+)?team)\b.*$(?:\n(?!\1\s|#{1,2}\s).*$)*/gim

  // Remove individual lines (bullets, paragraphs) asserting no team
  const linePatterns = [
    /^[-*]\s+.*?\b(?:no\s+(?:other\s+)?agents?\b|there\s+is\s+no\s+team|(?:I|you)\s+(?:am|are|work)\s+alone|no\s+team\s+(?:exist|member)|without\s+(?:a\s+)?team)\b.*$/gim,
    /^(?![-*#]).*\b(?:There\s+is\s+no\s+team|no\s+other\s+agents?\s+exist|you\s+(?:are|work)\s+alone|I\s+am\s+alone)\b.*$/gim,
  ]

  let cleaned = soul.replace(sectionPattern, '')
  for (const pat of linePatterns) {
    cleaned = cleaned.replace(pat, '')
  }

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

  lines.push('## IMPORTANT: Your Current Team Roster (Live — Overrides All Prior Beliefs)')
  lines.push(
    '> **This section reflects the actual current state of your organization. It supersedes any statements in your persona ' +
    'about being alone, having no team, or being a single agent. Those statements are outdated. ' +
    'You DO have a team. The agents listed below are real and report to you or work alongside you.**\n'
  )
  lines.push(
    'You are the top-level orchestrator. You have visibility into every agent in the organization ' +
    'and are responsible for routing work to the right team. You speak directly with team leads (your direct reports) — ' +
    'you do not skip levels and contact individual contributors directly unless there is no team lead above them.\n'
  )

  // Direct reports (team leads)
  const reports = agent.directReports
    .map(rid => allAgents.find(a => a.id === rid))
    .filter(Boolean) as Agent[]

  if (reports.length > 0) {
    lines.push('**Your direct reports (team leads you delegate to):**')
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
