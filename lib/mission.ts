import path from 'path'
import fs from 'fs'
import { requireEnv } from './env'
import type { MissionData } from './types'

const DEFAULT_MISSION: MissionData = {
  mission: 'Building the future of autonomous AI agent orchestration.',
  vision: 'A world where AI agents collaborate seamlessly to accomplish complex goals.',
  values: [
    { title: 'Autonomy', description: 'Agents operate independently with clear mandates.' },
    { title: 'Transparency', description: 'Every action is logged, auditable, and explainable.' },
    { title: 'Quality', description: 'No slop. No filler. Ship work that matters.' },
  ],
}

function getMissionPath(): string | null {
  const workspace = process.env.WORKSPACE_PATH
  if (!workspace) return null
  return path.join(workspace, 'clawport', 'mission.json')
}

export function loadMission(): MissionData {
  const filePath = getMissionPath()
  if (!filePath || !fs.existsSync(filePath)) return DEFAULT_MISSION
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw) as Partial<MissionData>
    return {
      mission: data.mission ?? DEFAULT_MISSION.mission,
      vision: data.vision ?? DEFAULT_MISSION.vision,
      values: Array.isArray(data.values) ? data.values : DEFAULT_MISSION.values,
    }
  } catch {
    return DEFAULT_MISSION
  }
}

export function saveMission(data: MissionData): void {
  const filePath = getMissionPath()
  if (!filePath) throw new Error('WORKSPACE_PATH is not set')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function loadUserMd(): string | null {
  const workspace = requireEnv('WORKSPACE_PATH')
  const userMdPath = path.join(workspace, 'shared', 'USER.md')
  if (!fs.existsSync(userMdPath)) return null
  try {
    return fs.readFileSync(userMdPath, 'utf-8')
  } catch {
    return null
  }
}
