import { getDb } from './db'
import { generateId } from './id'
import type { Project } from './types'

interface ProjectRow {
  id: string
  name: string
  description: string
  status: string
  priority: string
  lead_agent_id: string | null
  progress: number
  created_at: string
  updated_at: string
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as Project['status'],
    priority: row.priority as Project['priority'],
    leadAgentId: row.lead_agent_id,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getProjects(db = getDb()): Project[] {
  const rows = db
    .prepare('SELECT * FROM projects ORDER BY created_at DESC')
    .all() as ProjectRow[]
  return rows.map(rowToProject)
}

export function getProject(id: string, db = getDb()): Project | null {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | ProjectRow
    | undefined
  return row ? rowToProject(row) : null
}

export function createProject(
  data: { name: string; description?: string; status?: string; priority?: string; leadAgentId?: string | null },
  db = getDb()
): Project {
  const id = generateId()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO projects (id, name, description, status, priority, lead_agent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.description ?? '',
    data.status ?? 'planning',
    data.priority ?? 'medium',
    data.leadAgentId ?? null,
    now,
    now
  )
  return getProject(id, db)!
}

export function updateProject(
  id: string,
  data: Partial<{
    name: string
    description: string
    status: string
    priority: string
    leadAgentId: string | null
    progress: number
  }>,
  db = getDb()
): Project | null {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority) }
  if (data.leadAgentId !== undefined) { fields.push('lead_agent_id = ?'); values.push(data.leadAgentId) }
  if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress) }

  if (fields.length === 0) return getProject(id, db)

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getProject(id, db)
}

export function deleteProject(id: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  return result.changes > 0
}
