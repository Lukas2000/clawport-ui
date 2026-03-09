import fs from 'fs'
import { join } from 'path'
import { requireEnv } from '@/lib/env'
import { loadRegistry, type AgentEntry } from '@/lib/agents-registry'

// ---------------------------------------------------------------------------
// Team context sync — writes living team roster into each agent's SOUL.md
// so ALL channels (Telegram, CLI, etc.) see the same org structure.
// ---------------------------------------------------------------------------

const TEAM_BLOCK_START = '<!-- CLAWPORT:TEAM:START -->'
const TEAM_BLOCK_END = '<!-- CLAWPORT:TEAM:END -->'

function buildTeamBlock(agent: AgentEntry, all: AgentEntry[]): string {
  const lines: string[] = []

  if (agent.reportsTo === null) {
    // Orchestrator: full org view
    lines.push('## IMPORTANT: Your Current Team Roster (Live — Overrides All Prior Beliefs)')
    lines.push(
      '> **This section reflects the actual current state of your organization. It supersedes any statements in your persona ' +
      'about being alone, having no team, or being a single agent. Those statements are outdated. ' +
      'You DO have a team. The agents listed below are real and report to you or work alongside you.**\n'
    )
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
    // Team member: restricted view
    lines.push('## Your Team & Org Structure')
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
 * Called after any CRUD mutation so all channels (Telegram, CLI, etc.)
 * see the same org structure — not just ClawPort chat.
 */
function syncTeamContextToSouls(workspacePath: string, registry: AgentEntry[]): void {
  for (const agent of registry) {
    if (!agent.soulPath) continue
    const soulFile = join(workspacePath, agent.soulPath)
    if (!fs.existsSync(soulFile)) continue
    try {
      const current = fs.readFileSync(soulFile, 'utf-8')
      const updated = injectTeamBlock(current, buildTeamBlock(agent, registry))
      if (updated !== current) fs.writeFileSync(soulFile, updated, 'utf-8')
    } catch {
      // Non-fatal: if we can't write this agent's file, skip it
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a display name to a URL-safe slug */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'agent'
}

function ensureClawportDir(workspacePath: string): string {
  const dir = join(workspacePath, 'clawport')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/** Write the full registry as clawport/agents.json */
function writeOverrideRegistry(workspacePath: string, entries: AgentEntry[]): void {
  const clawportDir = ensureClawportDir(workspacePath)
  fs.writeFileSync(
    join(clawportDir, 'agents.json'),
    JSON.stringify(entries, null, 2),
    'utf-8'
  )
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateAgentOpts {
  name: string
  title: string
  emoji: string
  color: string
  reportsTo: string | null
  tools: string[]
  description: string
  soulContent?: string
  templateRef?: string // "category/slug" for overwrite-template support
}

export function createAgent(opts: CreateAgentOpts): AgentEntry {
  const workspacePath = requireEnv('WORKSPACE_PATH')
  const id = nameToSlug(opts.name)

  // Ensure unique ID
  const registry = loadRegistry()
  let uniqueId = id
  let counter = 1
  while (registry.some((a) => a.id === uniqueId)) {
    uniqueId = `${id}-${counter++}`
  }

  // Create agent directory
  const agentDir = join(workspacePath, 'agents', uniqueId)
  fs.mkdirSync(agentDir, { recursive: true })

  // Write SOUL.md
  const soulContent = opts.soulContent || `# SOUL.md — ${opts.name}

## Role
${opts.description}

## Core Truths
- Be genuinely helpful
- Have opinions and personality

## Rules
- Always be clear and direct
- Prioritize accuracy over speed
`
  fs.writeFileSync(join(agentDir, 'SOUL.md'), soulContent, 'utf-8')

  // Build the new entry
  const newEntry: AgentEntry = {
    id: uniqueId,
    name: opts.name,
    title: opts.title,
    emoji: opts.emoji,
    color: opts.color,
    reportsTo: opts.reportsTo,
    directReports: [],
    soulPath: `agents/${uniqueId}/SOUL.md`,
    voiceId: null,
    tools: opts.tools,
    memoryPath: null,
    description: opts.description,
  }

  // Update the override registry
  const updatedRegistry = [...registry]

  // Add to parent's directReports if parent exists
  if (opts.reportsTo) {
    const parent = updatedRegistry.find((a) => a.id === opts.reportsTo)
    if (parent && !parent.directReports.includes(uniqueId)) {
      parent.directReports = [...parent.directReports, uniqueId]
    }
  }

  updatedRegistry.push(newEntry)
  writeOverrideRegistry(workspacePath, updatedRegistry)
  syncTeamContextToSouls(workspacePath, updatedRegistry)

  return newEntry
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateAgentOpts {
  name?: string
  title?: string
  emoji?: string
  color?: string
  tools?: string[]
  description?: string
  reportsTo?: string | null
}

export function updateAgent(agentId: string, updates: UpdateAgentOpts): AgentEntry | null {
  const workspacePath = requireEnv('WORKSPACE_PATH')
  const registry = loadRegistry()
  const idx = registry.findIndex((a) => a.id === agentId)
  if (idx === -1) return null

  const agent = { ...registry[idx] }
  const updatedRegistry = [...registry]
  updatedRegistry[idx] = agent

  // Apply simple field updates
  if (updates.name !== undefined) agent.name = updates.name
  if (updates.title !== undefined) agent.title = updates.title
  if (updates.emoji !== undefined) agent.emoji = updates.emoji
  if (updates.color !== undefined) agent.color = updates.color
  if (updates.tools !== undefined) agent.tools = updates.tools
  if (updates.description !== undefined) agent.description = updates.description

  // Handle reportsTo change (hierarchy fixup)
  if (updates.reportsTo !== undefined && updates.reportsTo !== agent.reportsTo) {
    const oldParentId = agent.reportsTo

    // Remove from old parent's directReports
    if (oldParentId) {
      const oldParent = updatedRegistry.find((a) => a.id === oldParentId)
      if (oldParent) {
        oldParent.directReports = oldParent.directReports.filter((id) => id !== agentId)
      }
    }

    // Add to new parent's directReports
    if (updates.reportsTo) {
      const newParent = updatedRegistry.find((a) => a.id === updates.reportsTo)
      if (newParent && !newParent.directReports.includes(agentId)) {
        newParent.directReports = [...newParent.directReports, agentId]
      }
    }

    agent.reportsTo = updates.reportsTo
  }

  writeOverrideRegistry(workspacePath, updatedRegistry)
  syncTeamContextToSouls(workspacePath, updatedRegistry)
  return agent
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function deleteAgent(agentId: string): boolean {
  const workspacePath = requireEnv('WORKSPACE_PATH')
  const registry = loadRegistry()
  const agent = registry.find((a) => a.id === agentId)
  if (!agent) return false

  // Remove agent directory from filesystem
  const agentDir = join(workspacePath, 'agents', agentId)
  if (fs.existsSync(agentDir)) {
    fs.rmSync(agentDir, { recursive: true, force: true })
  }

  // Update registry: remove agent, fix parent's directReports, orphan children
  const updatedRegistry = registry.filter((a) => a.id !== agentId)

  // Remove from parent's directReports
  if (agent.reportsTo) {
    const parent = updatedRegistry.find((a) => a.id === agent.reportsTo)
    if (parent) {
      parent.directReports = parent.directReports.filter((id) => id !== agentId)
    }
  }

  // Orphan children: set their reportsTo to the deleted agent's parent
  for (const childId of agent.directReports) {
    const child = updatedRegistry.find((a) => a.id === childId)
    if (child) {
      child.reportsTo = agent.reportsTo

      // Add orphaned child to grandparent's directReports
      if (agent.reportsTo) {
        const grandparent = updatedRegistry.find((a) => a.id === agent.reportsTo)
        if (grandparent && !grandparent.directReports.includes(childId)) {
          grandparent.directReports = [...grandparent.directReports, childId]
        }
      }
    }
  }

  writeOverrideRegistry(workspacePath, updatedRegistry)
  syncTeamContextToSouls(workspacePath, updatedRegistry)
  return true
}
