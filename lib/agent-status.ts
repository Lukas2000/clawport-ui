import { getDb } from './db'
import type { AgentStatus, AgentRuntimeStatus } from './types'

interface StatusRow {
  agent_id: string
  status: string
  current_task_id: string | null
  last_active_at: string | null
  tasks_completed_total: number
  tasks_failed_total: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_cents: number
  session_id: string | null
  last_run_status: string | null
  last_error: string | null
  updated_at: string
}

function rowToStatus(row: StatusRow): AgentStatus {
  return {
    agentId: row.agent_id,
    status: row.status as AgentRuntimeStatus,
    currentTaskId: row.current_task_id,
    lastActiveAt: row.last_active_at,
    tasksCompletedTotal: row.tasks_completed_total,
    tasksFailedTotal: row.tasks_failed_total,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    totalCostCents: row.total_cost_cents,
    sessionId: row.session_id,
    lastRunStatus: row.last_run_status,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  }
}

export function getAgentStatuses(db = getDb()): AgentStatus[] {
  const rows = db.prepare('SELECT * FROM agent_status ORDER BY updated_at DESC').all() as StatusRow[]
  return rows.map(rowToStatus)
}

export function getAgentStatus(agentId: string, db = getDb()): AgentStatus | null {
  const row = db.prepare('SELECT * FROM agent_status WHERE agent_id = ?').get(agentId) as StatusRow | undefined
  return row ? rowToStatus(row) : null
}

/**
 * Ensure agent_status row exists (upsert idle if missing).
 */
export function ensureAgentStatus(agentId: string, db = getDb()): AgentStatus {
  db.prepare(
    `INSERT OR IGNORE INTO agent_status (agent_id) VALUES (?)`
  ).run(agentId)
  return getAgentStatus(agentId, db)!
}

export function updateAgentStatus(
  agentId: string,
  data: Partial<{
    status: AgentRuntimeStatus
    currentTaskId: string | null
    lastActiveAt: string
    sessionId: string | null
    lastRunStatus: string | null
    lastError: string | null
  }>,
  db = getDb()
): AgentStatus {
  ensureAgentStatus(agentId, db)

  const fields: string[] = []
  const values: unknown[] = []

  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.currentTaskId !== undefined) { fields.push('current_task_id = ?'); values.push(data.currentTaskId) }
  if (data.lastActiveAt !== undefined) { fields.push('last_active_at = ?'); values.push(data.lastActiveAt) }
  if (data.sessionId !== undefined) { fields.push('session_id = ?'); values.push(data.sessionId) }
  if (data.lastRunStatus !== undefined) { fields.push('last_run_status = ?'); values.push(data.lastRunStatus) }
  if (data.lastError !== undefined) { fields.push('last_error = ?'); values.push(data.lastError) }

  if (fields.length === 0) return getAgentStatus(agentId, db)!

  fields.push("updated_at = datetime('now')")
  values.push(agentId)

  db.prepare(`UPDATE agent_status SET ${fields.join(', ')} WHERE agent_id = ?`).run(...values)
  return getAgentStatus(agentId, db)!
}

/**
 * Increment completion/failure counters.
 */
export function recordTaskCompletion(agentId: string, succeeded: boolean, db = getDb()): void {
  ensureAgentStatus(agentId, db)
  const col = succeeded ? 'tasks_completed_total' : 'tasks_failed_total'
  db.prepare(
    `UPDATE agent_status SET ${col} = ${col} + 1, updated_at = datetime('now') WHERE agent_id = ?`
  ).run(agentId)
}

/**
 * Accumulate token usage and cost.
 */
export function recordTokenUsage(
  agentId: string,
  inputTokens: number,
  outputTokens: number,
  costCents: number,
  db = getDb()
): void {
  ensureAgentStatus(agentId, db)
  db.prepare(
    `UPDATE agent_status SET
      total_input_tokens = total_input_tokens + ?,
      total_output_tokens = total_output_tokens + ?,
      total_cost_cents = total_cost_cents + ?,
      updated_at = datetime('now')
    WHERE agent_id = ?`
  ).run(inputTokens, outputTokens, costCents, agentId)
}
