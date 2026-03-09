export const runtime = 'nodejs'

import { loadRegistry } from '@/lib/agents-registry'
import { requireEnv } from '@/lib/env'
import { invalidate } from '@/lib/server-cache'
import { apiErrorResponse } from '@/lib/api-error'

// Re-export the sync function so it can be called on demand
// (e.g. first-time setup, or when workspace SOUL.md files exist before ClawPort CRUD)
import fs from 'fs'
import { join } from 'path'

const TEAM_BLOCK_START = '<!-- CLAWPORT:TEAM:START -->'
const TEAM_BLOCK_END = '<!-- CLAWPORT:TEAM:END -->'

import type { AgentEntry } from '@/lib/agents-registry'

function buildTeamBlock(agent: AgentEntry, all: AgentEntry[]): string {
  const lines: string[] = []
  if (agent.reportsTo === null) {
    lines.push('## Your Team & Full Org Roster')
    lines.push('You are the top-level orchestrator with visibility into the entire organization.\n')
    const reports = agent.directReports.map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]
    if (reports.length > 0) {
      lines.push('**Your direct reports (team leads):**')
      for (const r of reports) {
        const tools = r.tools.length ? ` | Tools: ${r.tools.join(', ')}` : ''
        lines.push(`- ${r.emoji} **${r.name}** — ${r.title}${tools}`)
        if (r.description) lines.push(`  ${r.description}`)
        const sub = r.directReports.map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]
        for (const sr of sub) {
          lines.push(`    - ${sr.emoji} ${sr.name} — ${sr.title}`)
          if (sr.description) lines.push(`      ${sr.description}`)
        }
      }
      lines.push('')
    }
    const accounted = new Set([agent.id, ...reports.map(r => r.id), ...reports.flatMap(r => r.directReports)])
    const solo = all.filter(a => !accounted.has(a.id))
    if (solo.length > 0) {
      lines.push('**Other agents (contact directly):**')
      for (const s of solo) lines.push(`- ${s.emoji} **${s.name}** — ${s.title}`)
      lines.push('')
    }
    lines.push('**Before starting any project:** ask questions to fully understand scope before delegating.')
  } else {
    lines.push('## Your Team & Org Structure')
    lines.push('Communicate only with your manager, peers, and direct reports. Escalate cross-team needs up.\n')
    const manager = all.find(a => a.id === agent.reportsTo)
    if (manager) { lines.push(`**Your manager:** ${manager.emoji} **${manager.name}** — ${manager.title}`); lines.push('') }
    const peers = all.filter(a => a.id !== agent.id && a.reportsTo === agent.reportsTo)
    if (peers.length > 0) {
      lines.push('**Your peers:**')
      for (const p of peers) lines.push(`- ${p.emoji} **${p.name}** — ${p.title}`)
      lines.push('')
    }
    const reports = agent.directReports.map(id => all.find(a => a.id === id)).filter(Boolean) as AgentEntry[]
    if (reports.length > 0) {
      lines.push('**Your direct reports:**')
      for (const r of reports) lines.push(`- ${r.emoji} **${r.name}** — ${r.title}`)
    }
  }
  return lines.join('\n')
}

function syncAll(workspacePath: string, registry: AgentEntry[]): number {
  let count = 0
  for (const agent of registry) {
    if (!agent.soulPath) continue
    const soulFile = join(workspacePath, agent.soulPath)
    if (!fs.existsSync(soulFile)) continue
    try {
      const current = fs.readFileSync(soulFile, 'utf-8')
      const block = `${TEAM_BLOCK_START}\n${buildTeamBlock(agent, registry)}\n${TEAM_BLOCK_END}`
      const startIdx = current.indexOf(TEAM_BLOCK_START)
      const endIdx = current.indexOf(TEAM_BLOCK_END)
      const updated = startIdx !== -1 && endIdx !== -1
        ? current.slice(0, startIdx) + block + current.slice(endIdx + TEAM_BLOCK_END.length)
        : current.trimEnd() + '\n\n' + block + '\n'
      if (updated !== current) { fs.writeFileSync(soulFile, updated, 'utf-8'); count++ }
    } catch { /* skip */ }
  }
  return count
}

export async function POST() {
  try {
    const workspacePath = requireEnv('WORKSPACE_PATH')
    const registry = loadRegistry()
    const updated = syncAll(workspacePath, registry)
    invalidate('agents')
    return Response.json({ ok: true, updated, total: registry.length })
  } catch (err) {
    return apiErrorResponse(err)
  }
}
