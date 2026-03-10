import { getDb } from './db'
import { generateId } from './id'
import type { AgentSession, SessionType } from './types'

interface SessionRow {
  id: string
  agent_id: string
  task_key: string | null
  session_type: string
  context_summary: string | null
  state_data: string
  last_run_id: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

function rowToSession(row: SessionRow): AgentSession {
  return {
    id: row.id,
    agentId: row.agent_id,
    taskKey: row.task_key,
    sessionType: row.session_type as SessionType,
    contextSummary: row.context_summary,
    stateData: row.state_data,
    lastRunId: row.last_run_id,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get the latest session for an agent, optionally filtered by task key.
 */
export function getLatestSession(
  agentId: string,
  taskKey?: string | null,
  db = getDb()
): AgentSession | null {
  let row: SessionRow | undefined
  if (taskKey !== undefined && taskKey !== null) {
    row = db.prepare(
      'SELECT * FROM agent_sessions WHERE agent_id = ? AND task_key = ? ORDER BY updated_at DESC LIMIT 1'
    ).get(agentId, taskKey) as SessionRow | undefined
  } else {
    row = db.prepare(
      'SELECT * FROM agent_sessions WHERE agent_id = ? ORDER BY updated_at DESC LIMIT 1'
    ).get(agentId) as SessionRow | undefined
  }
  return row ? rowToSession(row) : null
}

/**
 * Save or update a session. Uses UPSERT on (agent_id, task_key) unique index.
 */
export function saveSession(
  data: {
    agentId: string
    taskKey?: string | null
    sessionType?: SessionType
    contextSummary?: string | null
    stateData?: string
    lastRunId?: string | null
    lastError?: string | null
  },
  db = getDb()
): AgentSession {
  const id = generateId()
  const taskKey = data.taskKey ?? null

  db.prepare(
    `INSERT INTO agent_sessions (id, agent_id, task_key, session_type, context_summary, state_data, last_run_id, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(agent_id, task_key) DO UPDATE SET
       context_summary = COALESCE(excluded.context_summary, context_summary),
       state_data = COALESCE(excluded.state_data, state_data),
       last_run_id = COALESCE(excluded.last_run_id, last_run_id),
       last_error = excluded.last_error,
       updated_at = datetime('now')`
  ).run(
    id,
    data.agentId,
    taskKey,
    data.sessionType ?? 'heartbeat',
    data.contextSummary ?? null,
    data.stateData ?? '{}',
    data.lastRunId ?? null,
    data.lastError ?? null
  )

  return getLatestSession(data.agentId, taskKey, db)!
}

/**
 * Get all sessions for an agent.
 */
export function getAgentSessions(agentId: string, db = getDb()): AgentSession[] {
  const rows = db.prepare(
    'SELECT * FROM agent_sessions WHERE agent_id = ? ORDER BY updated_at DESC'
  ).all(agentId) as SessionRow[]
  return rows.map(rowToSession)
}

/**
 * Delete a session.
 */
export function deleteSession(id: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM agent_sessions WHERE id = ?').run(id)
  return result.changes > 0
}
