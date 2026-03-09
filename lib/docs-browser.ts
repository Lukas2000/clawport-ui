import path from 'path'
import fs from 'fs'
import { requireEnv } from './env'

export interface DocNode {
  name: string
  relativePath: string
  isDir: boolean
  tags: string[]
  children?: DocNode[]
}

function getExtTag(name: string): string | null {
  const ext = path.extname(name).slice(1).toLowerCase()
  if (!ext) return null
  return ext
}

function scanDir(dirPath: string, basePath: string, parentTag?: string): DocNode[] {
  if (!fs.existsSync(dirPath)) return []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const nodes: DocNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dirPath, entry.name)
    const relativePath = path.relative(basePath, fullPath)

    if (entry.isDirectory()) {
      const children = scanDir(fullPath, basePath, entry.name)
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          relativePath,
          isDir: true,
          tags: [entry.name],
          children,
        })
      }
    } else {
      const tags: string[] = []
      if (parentTag) tags.push(parentTag)
      const extTag = getExtTag(entry.name)
      if (extTag) tags.push(extTag)
      nodes.push({
        name: entry.name,
        relativePath,
        isDir: false,
        tags,
      })
    }
  }

  return nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function getDocTree(): DocNode[] {
  const workspace = requireEnv('WORKSPACE_PATH')
  const docsDir = path.join(workspace, 'docs')
  return scanDir(docsDir, docsDir)
}

export function getDocContent(relativePath: string): string | null {
  const workspace = requireEnv('WORKSPACE_PATH')
  const fullPath = path.join(workspace, 'docs', relativePath)

  // Prevent directory traversal
  const resolved = path.resolve(fullPath)
  const docsRoot = path.resolve(path.join(workspace, 'docs'))
  if (!resolved.startsWith(docsRoot)) return null

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) return null
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return null
  }
}
