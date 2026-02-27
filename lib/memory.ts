import { MemoryFile } from '@/lib/types'
import { readFileSync, existsSync, statSync } from 'fs'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/Users/johnrice/.openclaw/workspace'

function readMemoryFile(label: string, filePath: string): MemoryFile | null {
  try {
    if (!existsSync(filePath)) return null
    const content = readFileSync(filePath, 'utf-8')
    const stats = statSync(filePath)
    return {
      label,
      path: filePath,
      content,
      lastModified: stats.mtime.toISOString(),
    }
  } catch {
    return null
  }
}

export async function getMemoryFiles(): Promise<MemoryFile[]> {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().slice(0, 10)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const candidates: [string, string][] = [
    ['Long-Term Memory (Jarvis)', WORKSPACE_PATH + '/MEMORY.md'],
    ['Team Memory', WORKSPACE_PATH + '/memory/team-memory.md'],
    ['Team Intel (JSON)', WORKSPACE_PATH + '/memory/team-intel.json'],
    ['Daily Log (Today)', WORKSPACE_PATH + '/memory/' + todayStr + '.md'],
    ['Daily Log (Yesterday)', WORKSPACE_PATH + '/memory/' + yesterdayStr + '.md'],
  ]

  const files: MemoryFile[] = []
  for (const [label, path] of candidates) {
    const file = readMemoryFile(label, path)
    if (file) files.push(file)
  }

  return files
}
