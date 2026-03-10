import { getDb } from './db'
import { generateId } from './id'
import type { HeartbeatConfig, HeartbeatRun, HeartbeatTrigger, HeartbeatRunStatus } from './types'

interface ConfigRow {
  agent_id: string
  enabled: number
  interval_minutes: number
  max_concurrent_runs: number
  last_beat_at: string | null
  next_beat_at: string | null
  consecutive_errors: number
  last_error: string | null
  created_at: string
  updated_at: string
}

interface RunRow {
  id: string
  agent_id: string
  trigger: string
  status: string
  started_at: string | null
  finished_at: string | null
  task_id: string | null
  tasks_checked: number
  tasks_executed: number
  error: string | null
  result: string | null
  usage_json: string
  created_at: string
}

function rowToConfig(row: ConfigRow): HeartbeatConfig {
  return {
    agentId: row.agent_id,
    enabled: row.enabled === 1,
    intervalMinutes: row.interval_minutes,
    maxConcurrentRuns: row.max_concurrent_runs,
    lastBeatAt: row.last_beat_at,
    nextBeatAt: row.next_beat_at,
    consecutiveErrors: row.consecutive_errors,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToRun(row: RunRow): HeartbeatRun {
  return {
    id: row.id,
    agentId: row.agent_id,
    trigger: row.trigger as HeartbeatTrigger,
    status: row.status as HeartbeatRunStatus,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    taskId: row.task_id,
    tasksChecked: row.tasks_checked,
    tasksExecuted: row.tasks_executed,
    error: row.error,
    result: row.result,
    usageJson: row.usage_json,
    createdAt: row.created_at,
  }
}

// ── Config CRUD ─────────────────────────────────────────────

export function getHeartbeatConfigs(db = getDb()): HeartbeatConfig[] {
  const rows = db.prepare('SELECT * FROM heartbeat_configs ORDER BY agent_id').all() as ConfigRow[]
  return rows.map(rowToConfig)
}

export function getHeartbeatConfig(agentId: string, db = getDb()): HeartbeatConfig | null {
  const row = db.prepare('SELECT * FROM heartbeat_configs WHERE agent_id = ?').get(agentId) as ConfigRow | undefined
  return row ? rowToConfig(row) : null
}

export function upsertHeartbeatConfig(
  agentId: string,
  data: Partial<{
    enabled: boolean
    intervalMinutes: number
    maxConcurrentRuns: number
  }>,
  db = getDb()
): HeartbeatConfig {
  db.prepare(
    `INSERT INTO heartbeat_configs (agent_id, enabled, interval_minutes, max_concurrent_runs)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET
       enabled = COALESCE(?, enabled),
       interval_minutes = COALESCE(?, interval_minutes),
       max_concurrent_runs = COALESCE(?, max_concurrent_runs),
       updated_at = datetime('now')`
  ).run(
    agentId,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : 0,
    data.intervalMinutes ?? 60,
    data.maxConcurrentRuns ?? 1,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : null,
    data.intervalMinutes ?? null,
    data.maxConcurrentRuns ?? null
  )
  return getHeartbeatConfig(agentId, db)!
}

// ── Run Management ──────────────────────────────────────────

export function getHeartbeatRuns(
  agentId: string,
  limit = 50,
  db = getDb()
): HeartbeatRun[] {
  const rows = db.prepare(
    'SELECT * FROM heartbeat_runs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(agentId, limit) as RunRow[]
  return rows.map(rowToRun)
}

export function getHeartbeatRun(id: string, db = getDb()): HeartbeatRun | null {
  const row = db.prepare('SELECT * FROM heartbeat_runs WHERE id = ?').get(id) as RunRow | undefined
  return row ? rowToRun(row) : null
}

/**
 * Queue a heartbeat run for an agent.
 */
export function queueHeartbeatRun(
  agentId: string,
  trigger: HeartbeatTrigger = 'scheduled',
  taskId?: string | null,
  db = getDb()
): HeartbeatRun {
  const id = generateId()
  db.prepare(
    `INSERT INTO heartbeat_runs (id, agent_id, trigger, task_id)
     VALUES (?, ?, ?, ?)`
  ).run(id, agentId, trigger, taskId ?? null)
  return getHeartbeatRun(id, db)!
}

/**
 * Try to start the next queued run, respecting concurrency limits.
 * Returns the started run or null if at capacity.
 */
export function startNextQueuedRun(agentId: string, db = getDb()): HeartbeatRun | null {
  const config = getHeartbeatConfig(agentId, db)
  const maxConcurrent = config?.maxConcurrentRuns ?? 1

  // Check current running count
  const running = db.prepare(
    `SELECT COUNT(*) as cnt FROM heartbeat_runs WHERE agent_id = ? AND status = 'running'`
  ).get(agentId) as { cnt: number }

  if (running.cnt >= maxConcurrent) return null

  // Get oldest queued run
  const queued = db.prepare(
    `SELECT * FROM heartbeat_runs WHERE agent_id = ? AND status = 'queued' ORDER BY created_at ASC LIMIT 1`
  ).get(agentId) as RunRow | undefined

  if (!queued) return null

  // Start it
  db.prepare(
    `UPDATE heartbeat_runs SET status = 'running', started_at = datetime('now') WHERE id = ?`
  ).run(queued.id)

  return getHeartbeatRun(queued.id, db)!
}

/**
 * Complete a heartbeat run (success or failure).
 */
export function completeHeartbeatRun(
  runId: string,
  data: {
    status: 'succeeded' | 'failed' | 'cancelled' | 'timed_out'
    tasksChecked?: number
    tasksExecuted?: number
    error?: string | null
    result?: string | null
    usageJson?: string
  },
  db = getDb()
): HeartbeatRun | null {
  db.prepare(
    `UPDATE heartbeat_runs SET
      status = ?,
      finished_at = datetime('now'),
      tasks_checked = COALESCE(?, tasks_checked),
      tasks_executed = COALESCE(?, tasks_executed),
      error = ?,
      result = ?,
      usage_json = COALESCE(?, usage_json)
    WHERE id = ?`
  ).run(
    data.status,
    data.tasksChecked ?? null,
    data.tasksExecuted ?? null,
    data.error ?? null,
    data.result ?? null,
    data.usageJson ?? null,
    runId
  )

  // Update config counters
  const run = getHeartbeatRun(runId, db)
  if (run) {
    if (data.status === 'succeeded') {
      db.prepare(
        `UPDATE heartbeat_configs SET consecutive_errors = 0, last_beat_at = datetime('now'), last_error = NULL, updated_at = datetime('now') WHERE agent_id = ?`
      ).run(run.agentId)
    } else if (data.status === 'failed') {
      db.prepare(
        `UPDATE heartbeat_configs SET consecutive_errors = consecutive_errors + 1, last_error = ?, updated_at = datetime('now') WHERE agent_id = ?`
      ).run(data.error ?? 'Unknown error', run.agentId)
    }
  }

  return run
}

/**
 * Get agents that are due for a heartbeat.
 */
export function getDueHeartbeats(db = getDb()): HeartbeatConfig[] {
  const now = new Date().toISOString()
  const rows = db.prepare(
    `SELECT * FROM heartbeat_configs
     WHERE enabled = 1
       AND (next_beat_at IS NULL OR next_beat_at <= ?)
     ORDER BY next_beat_at ASC`
  ).all(now) as ConfigRow[]
  return rows.map(rowToConfig)
}

/**
 * Update next_beat_at after a beat.
 */
export function scheduleNextBeat(agentId: string, db = getDb()): void {
  const config = getHeartbeatConfig(agentId, db)
  if (!config) return

  const next = new Date(Date.now() + config.intervalMinutes * 60000).toISOString()
  db.prepare(
    `UPDATE heartbeat_configs SET next_beat_at = ?, updated_at = datetime('now') WHERE agent_id = ?`
  ).run(next, agentId)
}

/**
 * Reap orphaned runs that have been 'running' for too long (default 30 min).
 */
export function reapOrphanedRuns(maxAgeMinutes = 30, db = getDb()): number {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60000).toISOString()
  const result = db.prepare(
    `UPDATE heartbeat_runs SET status = 'timed_out', finished_at = datetime('now'), error = 'Timed out (orphaned)'
     WHERE status = 'running' AND started_at < ?`
  ).run(cutoff)
  return result.changes
}
