import fs from 'fs'
import { join, basename } from 'path'
import { requireEnv } from '@/lib/env'
import { getAgents } from '@/lib/agents'
import type { AgentConfigFile } from '@/lib/types'

// ---------------------------------------------------------------------------
// Known config file definitions
// ---------------------------------------------------------------------------

interface ConfigFileDef {
  filename: string
  label: string
  description: string
  category: 'identity' | 'behavior' | 'workflow'
  template: string
}

const CONFIG_FILES: ConfigFileDef[] = [
  {
    filename: 'SOUL.md',
    label: 'SOUL.md',
    description: 'Agent persona, voice, and core instructions',
    category: 'identity',
    template: `# SOUL.md — {name}

## Role
You are {name}. Describe your role and responsibilities here.

## Core Truths
- Be genuinely helpful
- Have opinions and personality
- Actions speak louder than filler words

## Rules
- Always be clear and direct
- Prioritize accuracy over speed
`,
  },
  {
    filename: 'IDENTITY.md',
    label: 'IDENTITY.md',
    description: 'Agent name and emoji metadata',
    category: 'identity',
    template: `- **Name:** {name}
- **Emoji:** {emoji}
`,
  },
  {
    filename: 'HEARTBEAT.md',
    label: 'HEARTBEAT.md',
    description: 'Checklist executed on each heartbeat cron run',
    category: 'workflow',
    template: `# Heartbeat Checklist

Run these checks on each heartbeat cycle:

- [ ] Check for pending tasks
- [ ] Review recent activity
- [ ] Report any anomalies
`,
  },
]

// ---------------------------------------------------------------------------
// Directory resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the filesystem directory for an agent.
 * Root agent (no reportsTo, or id matches root) -> $WORKSPACE_PATH/
 * Other agents -> $WORKSPACE_PATH/agents/{id}/
 */
export async function getAgentDir(agentId: string): Promise<string | null> {
  const workspacePath = requireEnv('WORKSPACE_PATH')
  const agents = await getAgents()
  const agent = agents.find((a) => a.id === agentId)
  if (!agent) return null

  // If agent has a soulPath, derive directory from it
  if (agent.soulPath) {
    const fullPath = agent.soulPath.startsWith('/')
      ? agent.soulPath
      : join(workspacePath, agent.soulPath)
    // Directory is the parent of SOUL.md (or whatever the file is)
    const dir = join(fullPath, '..')
    return dir
  }

  // Root agent (no reportsTo) -> workspace root
  if (!agent.reportsTo) {
    return workspacePath
  }

  // Default: agents/{id}/
  return join(workspacePath, 'agents', agentId)
}

// ---------------------------------------------------------------------------
// Config file operations
// ---------------------------------------------------------------------------

export function getConfigFileDefs(): ConfigFileDef[] {
  return CONFIG_FILES
}

export async function listAgentConfigFiles(agentId: string): Promise<AgentConfigFile[]> {
  const dir = await getAgentDir(agentId)
  if (!dir) return []

  const agents = await getAgents()
  const agent = agents.find((a) => a.id === agentId)
  const name = agent?.name || agentId
  const emoji = agent?.emoji || '🤖'

  return CONFIG_FILES.map((def) => {
    const filePath = join(dir, def.filename)
    const exists = fs.existsSync(filePath)

    let content: string
    let lastModified: string | null = null

    if (exists) {
      try {
        content = fs.readFileSync(filePath, 'utf-8')
        const stat = fs.statSync(filePath)
        lastModified = stat.mtime.toISOString()
      } catch {
        content = renderTemplate(def.template, name, emoji)
      }
    } else {
      content = renderTemplate(def.template, name, emoji)
    }

    return {
      filename: def.filename,
      label: def.label,
      description: def.description,
      category: def.category,
      content,
      lastModified,
      isCustom: exists,
    }
  })
}

export async function readAgentConfigFile(
  agentId: string,
  filename: string
): Promise<AgentConfigFile | null> {
  const def = CONFIG_FILES.find((f) => f.filename === filename)
  if (!def) return null

  const dir = await getAgentDir(agentId)
  if (!dir) return null

  const agents = await getAgents()
  const agent = agents.find((a) => a.id === agentId)
  const name = agent?.name || agentId
  const emoji = agent?.emoji || '🤖'

  const filePath = join(dir, filename)
  const exists = fs.existsSync(filePath)

  let content: string
  let lastModified: string | null = null

  if (exists) {
    try {
      content = fs.readFileSync(filePath, 'utf-8')
      const stat = fs.statSync(filePath)
      lastModified = stat.mtime.toISOString()
    } catch {
      content = renderTemplate(def.template, name, emoji)
    }
  } else {
    content = renderTemplate(def.template, name, emoji)
  }

  return {
    filename: def.filename,
    label: def.label,
    description: def.description,
    category: def.category,
    content,
    lastModified,
    isCustom: exists,
  }
}

export async function writeAgentConfigFile(
  agentId: string,
  filename: string,
  content: string
): Promise<boolean> {
  // Validate filename is a known config file
  if (!CONFIG_FILES.some((f) => f.filename === filename)) return false

  const dir = await getAgentDir(agentId)
  if (!dir) return false

  try {
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(join(dir, filename), content, 'utf-8')
    return true
  } catch {
    return false
  }
}

export async function deleteAgentConfigFile(
  agentId: string,
  filename: string
): Promise<boolean> {
  if (!CONFIG_FILES.some((f) => f.filename === filename)) return false
  // Never delete SOUL.md — it's required
  if (filename === 'SOUL.md') return false

  const dir = await getAgentDir(agentId)
  if (!dir) return false

  const filePath = join(dir, filename)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Sub-agent file listing
// ---------------------------------------------------------------------------

export async function listSubAgentFiles(
  agentId: string
): Promise<{ filename: string; name: string; path: string }[]> {
  const dir = await getAgentDir(agentId)
  if (!dir) return []

  const results: { filename: string; name: string; path: string }[] = []

  for (const subDir of ['sub-agents', 'members']) {
    const fullDir = join(dir, subDir)
    if (!fs.existsSync(fullDir)) continue
    try {
      const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.md'))
      for (const f of files) {
        results.push({
          filename: f,
          name: basename(f, '.md'),
          path: join(fullDir, f),
        })
      }
    } catch {
      // skip unreadable directories
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTemplate(template: string, name: string, emoji: string): string {
  return template.replace(/\{name\}/g, name).replace(/\{emoji\}/g, emoji)
}
