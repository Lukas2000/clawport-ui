import fs from 'fs'
import { join, basename } from 'path'
import type { AgentTemplate, TemplateCategory } from '@/lib/types'

// ---------------------------------------------------------------------------
// Template directory resolution
// ---------------------------------------------------------------------------

/** Resolve the absolute path to the agents_templates directory */
function getTemplatesDir(): string {
  // Resolve relative to project root
  return join(process.cwd(), 'agents_templates')
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

interface Frontmatter {
  name: string
  description: string
  color: string
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter | null; body: string } {
  if (!content.startsWith('---')) {
    return { frontmatter: null, body: content }
  }

  const endIdx = content.indexOf('---', 3)
  if (endIdx === -1) {
    return { frontmatter: null, body: content }
  }

  const fmBlock = content.slice(3, endIdx).trim()
  const body = content.slice(endIdx + 3).trim()

  const fm: Record<string, string> = {}
  for (const line of fmBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    fm[key] = value
  }

  if (!fm.name) {
    return { frontmatter: null, body: content }
  }

  return {
    frontmatter: {
      name: fm.name,
      description: fm.description || '',
      color: fm.color || '#3b82f6',
    },
    body,
  }
}

/** Extract a name from the first markdown heading if no frontmatter */
function nameFromHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+)/m)
  if (!match) return null
  let heading = match[1].trim()
  // Strip emoji prefixes
  heading = heading.replace(/^[\p{Emoji}\u200d\uFE0F]+\s*/u, '').trim()
  // Strip "SOUL.md — " prefixes
  heading = heading.replace(/^SOUL\.md\s*[—–\-:]\s*/i, '').trim()
  return heading || null
}

// ---------------------------------------------------------------------------
// Color name to hex mapping
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
}

function resolveColor(color: string): string {
  if (color.startsWith('#')) return color
  return COLOR_MAP[color.toLowerCase()] || '#3b82f6'
}

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function slugToLabel(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function listTemplateCategories(): TemplateCategory[] {
  const dir = getTemplatesDir()
  if (!fs.existsSync(dir)) return []

  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => {
        const catDir = join(dir, e.name)
        const mdFiles = safeListMdFiles(catDir)
        return {
          slug: e.name,
          label: slugToLabel(e.name),
          count: mdFiles.length,
        }
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    return []
  }
}

export function listTemplates(category?: string): AgentTemplate[] {
  const dir = getTemplatesDir()
  if (!fs.existsSync(dir)) return []

  const categories = category
    ? [category]
    : fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name)

  const templates: AgentTemplate[] = []

  for (const cat of categories) {
    const catDir = join(dir, cat)
    const mdFiles = safeListMdFiles(catDir)

    for (const file of mdFiles) {
      const filePath = join(catDir, file)
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const slug = basename(file, '.md')
        const { frontmatter, body } = parseFrontmatter(content)

        templates.push({
          slug,
          category: cat,
          name: frontmatter?.name || nameFromHeading(content) || slugToLabel(slug),
          description: frontmatter?.description || '',
          color: resolveColor(frontmatter?.color || '#3b82f6'),
          content: frontmatter ? body : content,
        })
      } catch {
        // skip unreadable files
      }
    }
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name))
}

export function getTemplate(category: string, slug: string): AgentTemplate | null {
  const dir = getTemplatesDir()
  const filePath = join(dir, category, `${slug}.md`)

  if (!fs.existsSync(filePath)) return null

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    return {
      slug,
      category,
      name: frontmatter?.name || nameFromHeading(content) || slugToLabel(slug),
      description: frontmatter?.description || '',
      color: resolveColor(frontmatter?.color || '#3b82f6'),
      content: frontmatter ? body : content,
    }
  } catch {
    return null
  }
}

export function saveAsTemplate(
  category: string,
  slug: string,
  name: string,
  description: string,
  color: string,
  content: string
): boolean {
  const dir = getTemplatesDir()
  const catDir = join(dir, category)

  try {
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true })
    }

    const frontmatter = `---\nname: ${name}\ndescription: ${description}\ncolor: ${color}\n---\n\n`
    fs.writeFileSync(join(catDir, `${slug}.md`), frontmatter + content, 'utf-8')
    return true
  } catch {
    return false
  }
}

export function overwriteTemplate(
  category: string,
  slug: string,
  content: string
): boolean {
  const dir = getTemplatesDir()
  const filePath = join(dir, category, `${slug}.md`)

  if (!fs.existsSync(filePath)) return false

  try {
    const existing = fs.readFileSync(filePath, 'utf-8')
    const { frontmatter } = parseFrontmatter(existing)

    if (frontmatter) {
      // Preserve frontmatter, replace body
      const fm = `---\nname: ${frontmatter.name}\ndescription: ${frontmatter.description}\ncolor: ${frontmatter.color}\n---\n\n`
      fs.writeFileSync(filePath, fm + content, 'utf-8')
    } else {
      // No frontmatter, just overwrite
      fs.writeFileSync(filePath, content, 'utf-8')
    }
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeListMdFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }
}
