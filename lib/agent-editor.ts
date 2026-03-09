import fs from 'fs'

export interface AgentMdContent {
  content: string
  lastModified: string
  path: string
}

/**
 * Read an agent's SOUL.md file given its absolute path.
 */
export function readAgentMd(soulPath: string): AgentMdContent | null {
  if (!soulPath || !fs.existsSync(soulPath)) return null
  try {
    const content = fs.readFileSync(soulPath, 'utf-8')
    const stat = fs.statSync(soulPath)
    return {
      content,
      lastModified: stat.mtime.toISOString(),
      path: soulPath,
    }
  } catch {
    return null
  }
}

/**
 * Write content to an agent's SOUL.md file.
 */
export function writeAgentMd(soulPath: string, content: string): boolean {
  if (!soulPath) return false
  try {
    fs.writeFileSync(soulPath, content, 'utf-8')
    return true
  } catch {
    return false
  }
}
