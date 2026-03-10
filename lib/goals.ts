import { getDb } from './db'
import { generateId } from './id'
import type { Goal, GoalType, GoalStatus } from './types'

interface GoalRow {
  id: string
  title: string
  description: string
  type: string
  parent_goal_id: string | null
  owner_agent_id: string | null
  status: string
  target_value: number | null
  current_value: number
  target_date: string | null
  progress: number
  created_at: string
  updated_at: string
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as GoalType,
    parentGoalId: row.parent_goal_id,
    ownerAgentId: row.owner_agent_id,
    status: row.status as GoalStatus,
    targetValue: row.target_value,
    currentValue: row.current_value,
    targetDate: row.target_date,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface GoalFilters {
  status?: GoalStatus
  ownerAgentId?: string
  parentGoalId?: string | null
  type?: GoalType
}

export function getGoals(filters?: GoalFilters, db = getDb()): Goal[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters?.ownerAgentId) {
    conditions.push('owner_agent_id = ?')
    params.push(filters.ownerAgentId)
  }
  if (filters?.parentGoalId !== undefined) {
    if (filters.parentGoalId === null) {
      conditions.push('parent_goal_id IS NULL')
    } else {
      conditions.push('parent_goal_id = ?')
      params.push(filters.parentGoalId)
    }
  }
  if (filters?.type) {
    conditions.push('type = ?')
    params.push(filters.type)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM goals ${where} ORDER BY created_at DESC`)
    .all(...params) as GoalRow[]
  return rows.map(rowToGoal)
}

export function getGoal(id: string, db = getDb()): Goal | null {
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow | undefined
  return row ? rowToGoal(row) : null
}

export function createGoal(
  data: {
    title: string
    description?: string
    type?: GoalType
    parentGoalId?: string | null
    ownerAgentId?: string | null
    targetValue?: number | null
    targetDate?: string | null
  },
  db = getDb()
): Goal {
  const id = generateId()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO goals (id, title, description, type, parent_goal_id, owner_agent_id, target_value, target_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.title,
    data.description ?? '',
    data.type ?? 'goal',
    data.parentGoalId ?? null,
    data.ownerAgentId ?? null,
    data.targetValue ?? null,
    data.targetDate ?? null,
    now,
    now
  )
  return getGoal(id, db)!
}

export function updateGoal(
  id: string,
  data: Partial<{
    title: string
    description: string
    type: GoalType
    parentGoalId: string | null
    ownerAgentId: string | null
    status: GoalStatus
    targetValue: number | null
    currentValue: number
    targetDate: string | null
    progress: number
  }>,
  db = getDb()
): Goal | null {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type) }
  if (data.parentGoalId !== undefined) { fields.push('parent_goal_id = ?'); values.push(data.parentGoalId) }
  if (data.ownerAgentId !== undefined) { fields.push('owner_agent_id = ?'); values.push(data.ownerAgentId) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.targetValue !== undefined) { fields.push('target_value = ?'); values.push(data.targetValue) }
  if (data.currentValue !== undefined) { fields.push('current_value = ?'); values.push(data.currentValue) }
  if (data.targetDate !== undefined) { fields.push('target_date = ?'); values.push(data.targetDate) }
  if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress) }

  if (fields.length === 0) return getGoal(id, db)

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getGoal(id, db)
}

export function deleteGoal(id: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM goals WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Get the full goal tree as a flat array with hierarchy info.
 * Returns all goals, optionally starting from a root.
 */
export function getGoalTree(rootId?: string | null, db = getDb()): Goal[] {
  if (rootId) {
    // Get a specific subtree
    const result: Goal[] = []
    function collect(parentId: string) {
      const children = getGoals({ parentGoalId: parentId }, db)
      for (const child of children) {
        result.push(child)
        collect(child.id)
      }
    }
    const root = getGoal(rootId, db)
    if (root) {
      result.push(root)
      collect(rootId)
    }
    return result
  }
  // All goals
  return getGoals(undefined, db)
}

/**
 * Get the ancestry chain for a goal (parent -> grandparent -> ...).
 */
export function getGoalAncestry(goalId: string, db = getDb()): Goal[] {
  const ancestors: Goal[] = []
  const goal = getGoal(goalId, db)
  if (!goal) return ancestors

  let parentId = goal.parentGoalId
  for (let i = 0; i < 10 && parentId; i++) {
    const parent = getGoal(parentId, db)
    if (!parent) break
    ancestors.push(parent)
    parentId = parent.parentGoalId
  }

  return ancestors
}

/**
 * Get the goal ancestry for a project (project -> goal -> parent goal -> ...).
 * Returns the chain from the project's linked goal up to the root.
 */
export function getGoalAncestryForProject(projectId: string, db = getDb()): Goal[] {
  const row = db.prepare('SELECT goal_id FROM projects WHERE id = ?').get(projectId) as { goal_id: string | null } | undefined
  if (!row?.goal_id) return []

  const goal = getGoal(row.goal_id, db)
  if (!goal) return []

  return [goal, ...getGoalAncestry(goal.id, db)]
}

/**
 * Compute aggregated progress for a goal based on child goals and linked projects.
 */
export function computeGoalProgress(goalId: string, db = getDb()): number {
  const children = getGoals({ parentGoalId: goalId }, db)

  // Get linked projects
  const projects = db.prepare(
    'SELECT progress FROM projects WHERE goal_id = ?'
  ).all(goalId) as { progress: number }[]

  const allProgress = [
    ...children.map(c => c.progress),
    ...projects.map(p => p.progress),
  ]

  if (allProgress.length === 0) {
    // Leaf goal -- use its own progress
    const self = getGoal(goalId, db)
    return self?.progress ?? 0
  }

  return Math.round(allProgress.reduce((sum, p) => sum + p, 0) / allProgress.length)
}
