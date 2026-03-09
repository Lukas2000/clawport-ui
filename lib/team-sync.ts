import { loadRegistry } from '@/lib/agents-registry'
import { sanitizeSoulForTeam } from '@/lib/agents'
import type { AgentEntry } from '@/lib/agents-registry'
import fs from 'fs'
import { join } from 'path'

const TEAM_BLOCK_START = '<!-- CLAWPORT:TEAM:START -->'
const TEAM_BLOCK_END = '<!-- CLAWPORT:TEAM:END -->'

/**
 * Build a team context block for injection into an agent's SOUL.md on disk.
 * This is the disk-level equivalent of buildTeamContext() in lib/agents.ts.
 */
function buildTeamBlock(agent: AgentEntry, all: AgentEntry[]): string {
  const lines: string[] = []

  lines.push('## IMPORTANT: Your Current Team Roster (Live — Overrides All Prior Beliefs)')
  lines.push(
    '> **This section is injected by ClawPort and reflects the actual current state ' +
    'of your organization. It supersedes ANY prior statements in this document about ' +
    'being alone, having no team, being a single agent, or working solo. Those statements ' +
    'are outdated. You DO have a team. The agents listed below are real.**\n'
  )

  if (agent.reportsTo === null) {
    lines.push(
      'You are the top-level orchestrator with visibility into the entire organization. ' +
      'Route work to team leads (your direct reports) — they handle internal delegation.\n'
    )

    const reports = agent.directReports
      .map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]
    if (reports.length > 0) {
      lines.push('**Your direct reports (team leads):**')
      for (const r of reports) {
        const tools = r.tools.length ? ` | Tools: ${r.tools.join(', ')}` : ''
        lines.push(`- ${r.emoji} **${r.name}** — ${r.title}${tools}`)
        if (r.description) lines.push(`  ${r.description}`)
        const sub = r.directReports
          .map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]
        for (const sr of sub) {
          const srTools = sr.tools.length ? ` | Tools: ${sr.tools.join(', ')}` : ''
          lines.push(`    - ${sr.emoji} ${sr.name} — ${sr.title}${srTools}`)
          if (sr.description) lines.push(`      ${sr.description}`)
        }
      }
      lines.push('')
    }

    const accounted = new Set([
      agent.id,
      ...reports.map(r => r.id),
      ...reports.flatMap(r => r.directReports),
    ])
    const solo = all.filter(a => !accounted.has(a.id))
    if (solo.length > 0) {
      lines.push('**Other agents (contact directly):**')
      for (const s of solo) {
        const tools = s.tools.length ? ` | Tools: ${s.tools.join(', ')}` : ''
        lines.push(`- ${s.emoji} **${s.name}** — ${s.title}${tools}`)
        if (s.description) lines.push(`  ${s.description}`)
      }
      lines.push('')
    }

    lines.push(
      '**Before starting any project:** ask enough questions to fully understand scope, goals, ' +
      'constraints, and success criteria. Route through team leads — never skip levels.'
    )
  } else {
    lines.push(
      'You operate within a strict communication hierarchy. Communicate only with your manager, ' +
      'peers, and direct reports. Escalate cross-team needs to your manager.\n'
    )

    const manager = all.find(a => a.id === agent.reportsTo)
    if (manager) {
      lines.push('**Your manager (escalate up through here):**')
      lines.push(`- ${manager.emoji} **${manager.name}** — ${manager.title}`)
      if (manager.description) lines.push(`  ${manager.description}`)
      lines.push('')
    }

    const peers = all.filter(a => a.id !== agent.id && a.reportsTo === agent.reportsTo)
    if (peers.length > 0) {
      lines.push('**Your peers (direct collaboration allowed):**')
      for (const p of peers) {
        const tools = p.tools.length ? ` | Tools: ${p.tools.join(', ')}` : ''
        lines.push(`- ${p.emoji} **${p.name}** — ${p.title}${tools}`)
        if (p.description) lines.push(`  ${p.description}`)
      }
      lines.push('')
    }

    const reports = agent.directReports
      .map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]
    if (reports.length > 0) {
      lines.push('**Your direct reports:**')
      for (const r of reports) {
        const tools = r.tools.length ? ` | Tools: ${r.tools.join(', ')}` : ''
        lines.push(`- ${r.emoji} **${r.name}** — ${r.title}${tools}`)
        if (r.description) lines.push(`  ${r.description}`)
      }
      lines.push('')
    }

    lines.push('**Important:** No visibility into other teams. Escalate cross-team needs to your manager.')
  }

  return lines.join('\n')
}

function injectTeamBlock(soulContent: string, teamBlock: string): string {
  const block = `${TEAM_BLOCK_START}\n${teamBlock}\n${TEAM_BLOCK_END}`
  const startIdx = soulContent.indexOf(TEAM_BLOCK_START)
  const endIdx = soulContent.indexOf(TEAM_BLOCK_END)
  if (startIdx !== -1 && endIdx !== -1) {
    return soulContent.slice(0, startIdx) + block + soulContent.slice(endIdx + TEAM_BLOCK_END.length)
  }
  return soulContent.trimEnd() + '\n\n' + block + '\n'
}

/**
 * Write the current team roster into every agent's SOUL.md on disk.
 *
 * This modifies OpenClaw's SOUL.md files directly so that ALL channels
 * (Telegram, CLI, etc.) see the team structure — not just ClawPort chat.
 *
 * Two things happen to the SOUL.md:
 * 1. Contradictory "I am alone / no team" sections are stripped
 * 2. A delimited team roster block is injected (or updated if already present)
 */
export function syncTeamToSoulsSync(workspacePath: string, registry: AgentEntry[]): number {
  const hasTeam = registry.length > 1
  let count = 0
  for (const agent of registry) {
    if (!agent.soulPath) continue
    const soulFile = join(workspacePath, agent.soulPath)
    if (!fs.existsSync(soulFile)) continue
    try {
      const current = fs.readFileSync(soulFile, 'utf-8')
      const sanitized = sanitizeSoulForTeam(current, hasTeam)
      const updated = injectTeamBlock(sanitized, buildTeamBlock(agent, registry))
      if (updated !== current) {
        fs.writeFileSync(soulFile, updated, 'utf-8')
        count++
      }
    } catch {
      // Non-fatal: skip agents whose files can't be written
    }
  }
  return count
}

/**
 * Convenience wrapper: loads registry from env and syncs all SOUL.md files.
 * Safe to call fire-and-forget — returns 0 if WORKSPACE_PATH is not set.
 */
export async function syncTeamToSouls(): Promise<number> {
  const workspacePath = process.env.WORKSPACE_PATH
  if (!workspacePath) return 0
  const registry = loadRegistry()
  return syncTeamToSoulsSync(workspacePath, registry)
}
