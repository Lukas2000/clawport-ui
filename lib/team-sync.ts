import { loadRegistry } from '@/lib/agents-registry'
import type { AgentEntry } from '@/lib/agents-registry'
import { loadMission } from '@/lib/mission'
import fs from 'fs'
import { join } from 'path'

// ---------------------------------------------------------------------------
// Complete SOUL.md generation — replaces OpenClaw's pre-built files entirely
// ---------------------------------------------------------------------------

/**
 * Generate a complete, professional SOUL.md for the top-level orchestrator.
 * This REPLACES the original OpenClaw soul entirely — no injection, no patching.
 */
function buildOrchestratorSoul(agent: AgentEntry, all: AgentEntry[], mission: { mission: string; vision: string; values: { title: string; description: string }[] }): string {
  const lines: string[] = []

  lines.push(`# ${agent.name} — ${agent.title}`)
  lines.push('')
  lines.push(`You are **${agent.name}**, the top-level orchestrator and leader of this organization.`)
  lines.push(`Your role is to understand what the operator needs, plan the work, and delegate to your team.`)
  lines.push('')

  // Company mission
  if (mission.mission || mission.vision) {
    lines.push('## Company Mission')
    if (mission.mission) lines.push(`**Mission:** ${mission.mission}`)
    if (mission.vision) lines.push(`**Vision:** ${mission.vision}`)
    if (mission.values.length > 0) {
      lines.push('')
      lines.push('**Core Values:**')
      for (const v of mission.values) {
        lines.push(`- **${v.title}:** ${v.description}`)
      }
    }
    lines.push('')
  }

  // Core identity
  lines.push('## Who You Are')
  lines.push(`- You are ${agent.name}, the CEO-level orchestrator of this agent organization`)
  lines.push('- You lead a team of permanently assigned agents who report to you')
  lines.push('- You are decisive, strategic, and direct')
  lines.push('- You ask clarifying questions before committing to a plan')
  lines.push('- You delegate work to the right team member based on their skills')
  lines.push('- You never do work that should be delegated to a specialist')
  if (agent.description) {
    lines.push(`- ${agent.description}`)
  }
  lines.push('')

  // Team roster — the core of the soul
  lines.push('## Your Team')
  lines.push('')
  lines.push('These are your **permanently assigned team members**. They are always available,')
  lines.push('maintain continuity between sessions, and report directly to you.')
  lines.push('Route work to them by name.')
  lines.push('')

  const reports = agent.directReports
    .map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]

  if (reports.length > 0) {
    lines.push('### Direct Reports')
    for (const r of reports) {
      const tools = r.tools.length ? ` | Tools: ${r.tools.join(', ')}` : ''
      lines.push(`- ${r.emoji} **${r.name}** — ${r.title}${tools}`)
      if (r.description) lines.push(`  ${r.description}`)

      // Sub-reports
      const sub = r.directReports
        .map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]
      for (const sr of sub) {
        const srTools = sr.tools.length ? ` | Tools: ${sr.tools.join(', ')}` : ''
        lines.push(`  - ${sr.emoji} **${sr.name}** — ${sr.title}${srTools}`)
        if (sr.description) lines.push(`    ${sr.description}`)
      }
    }
    lines.push('')
  }

  // Solo agents not in any team lead's reports
  const accounted = new Set([
    agent.id,
    ...reports.map(r => r.id),
    ...reports.flatMap(r => r.directReports),
  ])
  const solo = all.filter(a => !accounted.has(a.id))
  if (solo.length > 0) {
    lines.push('### Other Team Members')
    for (const s of solo) {
      const tools = s.tools.length ? ` | Tools: ${s.tools.join(', ')}` : ''
      lines.push(`- ${s.emoji} **${s.name}** — ${s.title}${tools}`)
      if (s.description) lines.push(`  ${s.description}`)
    }
    lines.push('')
  }

  // Operating principles
  lines.push('## How You Operate')
  lines.push('')
  lines.push('1. **Listen first.** When the operator gives you a task, ask enough questions to fully understand scope, goals, constraints, and success criteria.')
  lines.push('2. **Plan.** Break the work into clear steps and identify which team members should handle each part.')
  lines.push('3. **Delegate.** Assign work to your direct reports. They handle internal delegation within their teams.')
  lines.push('4. **Follow up.** Track progress, remove blockers, and report back to the operator.')
  lines.push('5. **Never skip levels.** Route through team leads. Do not bypass the hierarchy.')
  lines.push('')

  // Communication rules
  lines.push('## Communication Style')
  lines.push('')
  lines.push('- Be concise and direct. No filler.')
  lines.push('- Lead with the answer, then explain if needed.')
  lines.push('- When you have a team member who can handle something, say so and delegate.')
  lines.push('- Do not pretend to do work yourself when you have a specialist for it.')
  lines.push('- No em dashes. No corporate jargon. Speak plainly.')
  lines.push('')

  return lines.join('\n')
}

/**
 * Generate a complete, professional SOUL.md for a team member (non-orchestrator).
 * This REPLACES the original OpenClaw soul entirely.
 */
function buildMemberSoul(agent: AgentEntry, all: AgentEntry[], mission: { mission: string; vision: string; values: { title: string; description: string }[] }): string {
  const lines: string[] = []

  lines.push(`# ${agent.name} — ${agent.title}`)
  lines.push('')
  lines.push(`You are **${agent.name}**, ${agent.title} in this organization.`)
  if (agent.description) {
    lines.push(agent.description)
  }
  lines.push('')

  // Company mission
  if (mission.mission || mission.vision) {
    lines.push('## Company Mission')
    if (mission.mission) lines.push(`**Mission:** ${mission.mission}`)
    if (mission.vision) lines.push(`**Vision:** ${mission.vision}`)
    if (mission.values.length > 0) {
      lines.push('')
      lines.push('**Core Values:**')
      for (const v of mission.values) {
        lines.push(`- **${v.title}:** ${v.description}`)
      }
    }
    lines.push('')
  }

  // Tools
  if (agent.tools.length > 0) {
    lines.push('## Your Tools & Capabilities')
    for (const t of agent.tools) {
      lines.push(`- ${t}`)
    }
    lines.push('')
  }

  // Org structure — strictly hierarchical
  lines.push('## Your Place in the Organization')
  lines.push('')
  lines.push('You operate within a strict communication hierarchy.')
  lines.push('You may communicate directly with your manager, your peers, and your direct reports.')
  lines.push('For anything outside your immediate group, escalate to your manager.')
  lines.push('')

  const manager = all.find(a => a.id === agent.reportsTo)
  if (manager) {
    lines.push('### Your Manager')
    lines.push(`- ${manager.emoji} **${manager.name}** — ${manager.title}`)
    if (manager.description) lines.push(`  ${manager.description}`)
    lines.push('')
  }

  const peers = all.filter(a => a.id !== agent.id && a.reportsTo === agent.reportsTo)
  if (peers.length > 0) {
    lines.push('### Your Peers')
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
    lines.push('### Your Direct Reports')
    for (const r of reports) {
      const tools = r.tools.length ? ` | Tools: ${r.tools.join(', ')}` : ''
      lines.push(`- ${r.emoji} **${r.name}** — ${r.title}${tools}`)
      if (r.description) lines.push(`  ${r.description}`)
    }
    lines.push('')
  }

  // Communication rules
  lines.push('## Communication Style')
  lines.push('')
  lines.push('- Be concise and direct. No filler.')
  lines.push('- Lead with the answer, then explain if needed.')
  lines.push('- Stay in your lane. Do not take on work outside your role.')
  lines.push('- Escalate cross-team needs to your manager.')
  lines.push('- No em dashes. No corporate jargon. Speak plainly.')
  lines.push('')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Sync — complete SOUL.md replacement
// ---------------------------------------------------------------------------

/**
 * Completely rewrite every agent's SOUL.md on disk with a clean, professional
 * soul that inherently knows its team, hierarchy, and role.
 *
 * Previous approach (inject/patch/frame) failed because OpenClaw's pre-built
 * SOUL.md files contain 20K+ chars of "spawn agents on demand" worldview that
 * drowns out any injected team context. The only reliable solution is a
 * complete replacement.
 *
 * Backups are saved on first modification so the user can revert if needed.
 */
export function syncTeamToSoulsSync(workspacePath: string, registry: AgentEntry[]): number {
  if (registry.length <= 1) return 0

  const mission = loadMission()
  let count = 0

  for (const agent of registry) {
    if (!agent.soulPath) continue
    const soulFile = join(workspacePath, agent.soulPath)

    // Ensure parent directory exists (for newly created agents)
    const soulDir = join(soulFile, '..')
    if (!fs.existsSync(soulDir)) {
      fs.mkdirSync(soulDir, { recursive: true })
    }

    try {
      // Read current content (if exists) for backup
      const current = fs.existsSync(soulFile)
        ? fs.readFileSync(soulFile, 'utf-8')
        : ''

      // Generate complete replacement soul
      const isOrchestrator = agent.reportsTo === null
      const newSoul = isOrchestrator
        ? buildOrchestratorSoul(agent, registry, mission)
        : buildMemberSoul(agent, registry, mission)

      if (newSoul !== current) {
        // Save one-time backup before first ClawPort modification
        if (current) {
          const backupFile = soulFile + '.clawport-backup'
          if (!fs.existsSync(backupFile)) {
            fs.writeFileSync(backupFile, current, 'utf-8')
          }
        }
        fs.writeFileSync(soulFile, newSoul, 'utf-8')
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
