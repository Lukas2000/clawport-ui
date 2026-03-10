import { getDb } from './db'
import { generateId } from './id'
import type { CostEvent } from './types'

interface CostEventRow {
  id: string
  agent_id: string
  run_id: string | null
  task_id: string | null
  project_id: string | null
  goal_id: string | null
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  cached_input_tokens: number
  cost_cents: number
  occurred_at: string
  created_at: string
}

function rowToEvent(row: CostEventRow): CostEvent {
  return {
    id: row.id,
    agentId: row.agent_id,
    runId: row.run_id,
    taskId: row.task_id,
    projectId: row.project_id,
    goalId: row.goal_id,
    provider: row.provider,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    cachedInputTokens: row.cached_input_tokens,
    costCents: row.cost_cents,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }
}

export interface CostEventFilters {
  agentId?: string
  runId?: string
  taskId?: string
  projectId?: string
  goalId?: string
  since?: string
  until?: string
  limit?: number
}

export function getCostEvents(filters?: CostEventFilters, db = getDb()): CostEvent[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.agentId) { conditions.push('agent_id = ?'); params.push(filters.agentId) }
  if (filters?.runId) { conditions.push('run_id = ?'); params.push(filters.runId) }
  if (filters?.taskId) { conditions.push('task_id = ?'); params.push(filters.taskId) }
  if (filters?.projectId) { conditions.push('project_id = ?'); params.push(filters.projectId) }
  if (filters?.goalId) { conditions.push('goal_id = ?'); params.push(filters.goalId) }
  if (filters?.since) { conditions.push('occurred_at >= ?'); params.push(filters.since) }
  if (filters?.until) { conditions.push('occurred_at <= ?'); params.push(filters.until) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters?.limit ? `LIMIT ${filters.limit}` : ''

  const rows = db.prepare(
    `SELECT * FROM cost_events ${where} ORDER BY occurred_at DESC ${limit}`
  ).all(...params) as CostEventRow[]
  return rows.map(rowToEvent)
}

export function recordCostEvent(
  data: {
    agentId: string
    runId?: string | null
    taskId?: string | null
    projectId?: string | null
    goalId?: string | null
    provider?: string
    model: string
    inputTokens: number
    outputTokens: number
    cachedInputTokens?: number
    costCents: number
  },
  db = getDb()
): CostEvent {
  const id = generateId()
  db.prepare(
    `INSERT INTO cost_events (id, agent_id, run_id, task_id, project_id, goal_id, provider, model, input_tokens, output_tokens, cached_input_tokens, cost_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.agentId,
    data.runId ?? null,
    data.taskId ?? null,
    data.projectId ?? null,
    data.goalId ?? null,
    data.provider ?? 'anthropic',
    data.model,
    data.inputTokens,
    data.outputTokens,
    data.cachedInputTokens ?? 0,
    data.costCents
  )
  return getCostEvent(id, db)!
}

export function getCostEvent(id: string, db = getDb()): CostEvent | null {
  const row = db.prepare('SELECT * FROM cost_events WHERE id = ?').get(id) as CostEventRow | undefined
  return row ? rowToEvent(row) : null
}

/**
 * Aggregate costs by agent for the current month.
 */
export function getCostsByAgent(db = getDb()): { agentId: string; totalCents: number; eventCount: number }[] {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const rows = db.prepare(
    `SELECT agent_id, SUM(cost_cents) as total_cents, COUNT(*) as event_count
     FROM cost_events
     WHERE occurred_at >= ?
     GROUP BY agent_id
     ORDER BY total_cents DESC`
  ).all(monthStart.toISOString()) as { agent_id: string; total_cents: number; event_count: number }[]
  return rows.map(r => ({
    agentId: r.agent_id,
    totalCents: r.total_cents,
    eventCount: r.event_count,
  }))
}

/**
 * Aggregate costs by project.
 */
export function getCostsByProject(db = getDb()): { projectId: string; totalCents: number }[] {
  const rows = db.prepare(
    `SELECT project_id, SUM(cost_cents) as total_cents
     FROM cost_events
     WHERE project_id IS NOT NULL
     GROUP BY project_id
     ORDER BY total_cents DESC`
  ).all() as { project_id: string; total_cents: number }[]
  return rows.map(r => ({
    projectId: r.project_id,
    totalCents: r.total_cents,
  }))
}
