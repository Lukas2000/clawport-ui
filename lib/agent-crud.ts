import fs from 'fs'
import { join } from 'path'
import { requireEnv } from '@/lib/env'
import { loadRegistry, type AgentEntry } from '@/lib/agents-registry'

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
  return true
}
