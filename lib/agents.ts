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
