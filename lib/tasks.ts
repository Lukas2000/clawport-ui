import { getDb } from './db'
import { generateId } from './id'
import type { Task, TaskStats } from './types'

interface TaskRow {
  id: string
  title: string
  description: string
  status: string
  priority: string
  project_id: string | null
  assigned_agent_id: string | null
  assignee_role: string | null
  labels: string
  due_date: string | null
  recurring_cron: string | null
  work_state: string
  work_started_at: number | null
  work_error: string | null
  work_result: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

function rowToTask(row: TaskRow): Task {
  let labels: string[] = []
  try { labels = JSON.parse(row.labels) } catch { /* empty */ }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    projectId: row.project_id,
    assignedAgentId: row.assigned_agent_id,
    assigneeRole: row.assignee_role,
    labels,
    dueDate: row.due_date,
    recurringCron: row.recurring_cron,
    workState: row.work_state as Task['workState'],
    workStartedAt: row.work_started_at,
    workError: row.work_error,
    workResult: row.work_result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

export interface TaskFilters {
  agentId?: string
  projectId?: string
  status?: string
}

export function getTasks(filters?: TaskFilters, db = getDb()): Task[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.agentId) {
    conditions.push('assigned_agent_id = ?')
    params.push(filters.agentId)
  }
  if (filters?.projectId) {
    conditions.push('project_id = ?')
    params.push(filters.projectId)
  }
  if (filters?.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC`)
    .all(...params) as TaskRow[]
  return rows.map(rowToTask)
}

export function getTask(id: string, db = getDb()): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined
  return row ? rowToTask(row) : null
}

export function createTask(
  data: {
    title: string
    description?: string
    status?: string
    priority?: string
    projectId?: string | null
    assignedAgentId?: string | null
    assigneeRole?: string | null
    labels?: string[]
    dueDate?: string | null
    recurringCron?: string | null
  },
  db = getDb()
): Task {
  const id = generateId()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO tasks (id, title, description, status, priority, project_id, assigned_agent_id, assignee_role, labels, due_date, recurring_cron, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.title,
    data.description ?? '',
    data.status ?? 'backlog',
    data.priority ?? 'medium',
    data.projectId ?? null,
    data.assignedAgentId ?? null,
    data.assigneeRole ?? null,
    JSON.stringify(data.labels ?? []),
    data.dueDate ?? null,
    data.recurringCron ?? null,
    now,
    now
  )
  return getTask(id, db)!
}

export function updateTask(
  id: string,
  data: Partial<{
    title: string
    description: string
    status: string
    priority: string
    projectId: string | null
    assignedAgentId: string | null
    assigneeRole: string | null
    labels: string[]
    dueDate: string | null
    recurringCron: string | null
    workState: string
    workStartedAt: number | null
    workError: string | null
    workResult: string | null
    completedAt: string | null
  }>,
  db = getDb()
): Task | null {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority) }
  if (data.projectId !== undefined) { fields.push('project_id = ?'); values.push(data.projectId) }
  if (data.assignedAgentId !== undefined) { fields.push('assigned_agent_id = ?'); values.push(data.assignedAgentId) }
  if (data.assigneeRole !== undefined) { fields.push('assignee_role = ?'); values.push(data.assigneeRole) }
  if (data.labels !== undefined) { fields.push('labels = ?'); values.push(JSON.stringify(data.labels)) }
  if (data.dueDate !== undefined) { fields.push('due_date = ?'); values.push(data.dueDate) }
  if (data.recurringCron !== undefined) { fields.push('recurring_cron = ?'); values.push(data.recurringCron) }
  if (data.workState !== undefined) { fields.push('work_state = ?'); values.push(data.workState) }
  if (data.workStartedAt !== undefined) { fields.push('work_started_at = ?'); values.push(data.workStartedAt) }
  if (data.workError !== undefined) { fields.push('work_error = ?'); values.push(data.workError) }
  if (data.workResult !== undefined) { fields.push('work_result = ?'); values.push(data.workResult) }
  if (data.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(data.completedAt) }

  if (fields.length === 0) return getTask(id, db)

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getTask(id, db)
}

export function deleteTask(id: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return result.changes > 0
}

export function getTaskStats(db = getDb()): TaskStats {
  const total = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count

  const inProgress = (
    db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in-progress'").get() as { count: number }
  ).count

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeek = (
    db.prepare('SELECT COUNT(*) as count FROM tasks WHERE created_at >= ?').get(weekAgo.toISOString()) as {
      count: number
    }
  ).count

  const completed = (
    db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'done'").get() as { count: number }
  ).count

  return {
    thisWeek,
    inProgress,
    total,
    completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

/**
 * Bulk import tasks from localStorage migration.
 * Skips tasks whose IDs already exist.
 */
export function migrateTasks(
  tickets: Array<{
    id: string
    title: string
    description: string
    status: string
    priority: string
    assigneeId: string | null
    assigneeRole: string | null
    workState: string
    workStartedAt: number | null
    workError: string | null
    workResult: string | null
    createdAt: number
    updatedAt: number
  }>,
  db = getDb()
): number {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO tasks (id, title, description, status, priority, assigned_agent_id, assignee_role, work_state, work_started_at, work_error, work_result, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const tx = db.transaction(() => {
    let count = 0
    for (const t of tickets) {
      const result = insert.run(
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigneeId,
        t.assigneeRole,
        t.workState,
        t.workStartedAt,
        t.workError,
        t.workResult,
        new Date(t.createdAt).toISOString(),
        new Date(t.updatedAt).toISOString()
      )
      if (result.changes > 0) count++
    }
    return count
  })

  return tx()
}

