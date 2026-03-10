import { getDb } from './db'
import { generateId } from './id'
import type { Task, TaskStats } from './types'
import type Database from 'better-sqlite3'

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
  identifier: string | null
  issue_number: number | null
  parent_id: string | null
  checkout_agent_id: string | null
  checkout_at: string | null
  started_at: string | null
  cancelled_at: string | null
  hidden_at: string | null
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
    priority: (row.priority || 'medium') as Task['priority'],
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
    identifier: row.identifier ?? null,
    issueNumber: row.issue_number ?? null,
    parentId: row.parent_id ?? null,
    checkoutAgentId: row.checkout_agent_id ?? null,
    checkoutAt: row.checkout_at ?? null,
    startedAt: row.started_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    hiddenAt: row.hidden_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

export interface TaskFilters {
  agentId?: string
  projectId?: string
  status?: string
  priority?: string
  parentId?: string | null
  search?: string
  excludeHidden?: boolean
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
  if (filters?.priority) {
    conditions.push('priority = ?')
    params.push(filters.priority)
  }
  if (filters?.parentId !== undefined) {
    if (filters.parentId === null) {
      conditions.push('parent_id IS NULL')
    } else {
      conditions.push('parent_id = ?')
      params.push(filters.parentId)
    }
  }
  if (filters?.search) {
    conditions.push('(title LIKE ? OR identifier LIKE ?)')
    const term = `%${filters.search}%`
    params.push(term, term)
  }
  if (filters?.excludeHidden) {
    conditions.push('hidden_at IS NULL')
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

/**
 * Get the next issue number for a project (or global if no project).
 * Returns a sequential number for generating identifiers like "CP-42".
 */
function nextIssueNumber(projectId: string | null, db: Database.Database): number {
  const condition = projectId ? 'project_id = ?' : 'project_id IS NULL'
  const params = projectId ? [projectId] : []
  const row = db.prepare(
    `SELECT COALESCE(MAX(issue_number), 0) + 1 as next_num FROM tasks WHERE ${condition}`
  ).get(...params) as { next_num: number }
  return row.next_num
}

/**
 * Generate an issue identifier like "CP-42" from a project name or "CP" default prefix.
 */
function generateIdentifier(issueNumber: number, projectId: string | null, db: Database.Database): string {
  let prefix = 'CP'
  if (projectId) {
    const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as { name: string } | undefined
    if (project) {
      // Take first letters of each word, max 3 chars, uppercase
      prefix = project.name
        .split(/\s+/)
        .map(w => w[0])
        .join('')
        .slice(0, 3)
        .toUpperCase() || 'CP'
    }
  }
  return `${prefix}-${issueNumber}`
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
    parentId?: string | null
  },
  db = getDb()
): Task {
  const id = generateId()
  const now = new Date().toISOString()
  const projectId = data.projectId ?? null
  const issueNumber = nextIssueNumber(projectId, db)
  const identifier = generateIdentifier(issueNumber, projectId, db)
  const status = data.status ?? 'backlog'

  // Lifecycle timestamps based on initial status
  const startedAt = status === 'in-progress' ? now : null
  const completedAt = status === 'done' ? now : null
  const cancelledAt = status === 'cancelled' ? now : null

  db.prepare(
    `INSERT INTO tasks (id, title, description, status, priority, project_id, assigned_agent_id, assignee_role, labels, due_date, recurring_cron, parent_id, identifier, issue_number, started_at, completed_at, cancelled_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.title,
    data.description ?? '',
    status,
    data.priority ?? 'medium',
    projectId,
    data.assignedAgentId ?? null,
    data.assigneeRole ?? null,
    JSON.stringify(data.labels ?? []),
    data.dueDate ?? null,
    data.recurringCron ?? null,
    data.parentId ?? null,
    identifier,
    issueNumber,
    startedAt,
    completedAt,
    cancelledAt,
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
    parentId: string | null
    hiddenAt: string | null
  }>,
  db = getDb()
): Task | null {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
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
  if (data.parentId !== undefined) { fields.push('parent_id = ?'); values.push(data.parentId) }
  if (data.hiddenAt !== undefined) { fields.push('hidden_at = ?'); values.push(data.hiddenAt) }

  // Status lifecycle timestamps
  if (data.status !== undefined) {
    fields.push('status = ?')
    values.push(data.status)
    const now = new Date().toISOString()
    if (data.status === 'in-progress') {
      fields.push('started_at = COALESCE(started_at, ?)')
      values.push(now)
    } else if (data.status === 'done') {
      fields.push('completed_at = COALESCE(completed_at, ?)')
      values.push(now)
    } else if (data.status === 'cancelled') {
      fields.push('cancelled_at = COALESCE(cancelled_at, ?)')
      values.push(now)
    }
  }

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

/**
 * Atomically checkout a task for an agent. Returns success/failure.
 * Only one agent can checkout a task at a time (Paperclip's optimistic locking pattern).
 */
export function checkoutTask(
  taskId: string,
  agentId: string,
  db = getDb()
): { success: boolean; error?: string } {
  const tx = db.transaction(() => {
    const row = db.prepare(
      'SELECT id, status, checkout_agent_id FROM tasks WHERE id = ?'
    ).get(taskId) as { id: string; status: string; checkout_agent_id: string | null } | undefined

    if (!row) return { success: false, error: 'Task not found' }
    if (row.status === 'done' || row.status === 'cancelled') {
      return { success: false, error: `Task is ${row.status}` }
    }
    if (row.checkout_agent_id && row.checkout_agent_id !== agentId) {
      return { success: false, error: `Task already checked out by ${row.checkout_agent_id}` }
    }
    if (row.checkout_agent_id === agentId) {
      return { success: true } // Already checked out by this agent
    }

    const now = new Date().toISOString()
    db.prepare(
      "UPDATE tasks SET checkout_agent_id = ?, checkout_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(agentId, now, taskId)

    return { success: true }
  })

  return tx()
}

/**
 * Release a task checkout. Only the agent that checked it out (or operator) can release.
 */
export function releaseCheckout(
  taskId: string,
  agentId: string | null,
  db = getDb()
): { success: boolean; error?: string } {
  const tx = db.transaction(() => {
    const row = db.prepare(
      'SELECT checkout_agent_id FROM tasks WHERE id = ?'
    ).get(taskId) as { checkout_agent_id: string | null } | undefined

    if (!row) return { success: false, error: 'Task not found' }
    if (!row.checkout_agent_id) return { success: true } // Already released

    // Allow release if: same agent, or operator (agentId === null)
    if (agentId !== null && row.checkout_agent_id !== agentId) {
      return { success: false, error: 'Only the checkout owner or operator can release' }
    }

    db.prepare(
      "UPDATE tasks SET checkout_agent_id = NULL, checkout_at = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(taskId)

    return { success: true }
  })

  return tx()
}

/**
 * Get the ancestry chain for a task (parent → grandparent → ...).
 * Useful for showing breadcrumbs and injecting goal context.
 */
export function getTaskAncestry(taskId: string, db = getDb()): Task[] {
  const ancestors: Task[] = []
  let currentId: string | null = taskId

  // Walk up parent chain (max 10 levels to prevent infinite loops)
  for (let i = 0; i < 10 && currentId; i++) {
    const task = getTask(currentId, db)
    if (!task || !task.parentId) break
    const parent = getTask(task.parentId, db)
    if (!parent) break
    ancestors.push(parent)
    currentId = parent.parentId
  }

  return ancestors
}

/**
 * Get sub-issues (direct children) of a task.
 */
export function getSubIssues(taskId: string, db = getDb()): Task[] {
  const rows = db.prepare(
    'SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at ASC'
  ).all(taskId) as TaskRow[]
  return rows.map(rowToTask)
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
