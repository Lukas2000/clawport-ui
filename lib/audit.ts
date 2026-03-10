import { getDb } from './db'
import { generateId } from './id'
import type { AuditEntry, AuditActorType } from './types'

interface AuditRow {
  id: string
  timestamp: string
  actor_type: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  agent_id: string | null
  run_id: string | null
  details: string
  created_at: string
}

function rowToEntry(row: AuditRow): AuditEntry {
  let details: Record<string, unknown> = {}
  try { details = JSON.parse(row.details) } catch { /* ignore */ }
  return {
    id: row.id,
    timestamp: row.timestamp,
    actorType: row.actor_type as AuditActorType,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    agentId: row.agent_id,
    runId: row.run_id,
    details,
    createdAt: row.created_at,
  }
}

export interface LogAuditParams {
  actorType: AuditActorType
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  agentId?: string | null
  runId?: string | null
  details?: Record<string, unknown>
}

export function logAudit(entry: LogAuditParams, db = getDb()): AuditEntry {
  const id = generateId()
  const now = new Date().toISOString()
  const detailsJson = JSON.stringify(entry.details ?? {})
  db.prepare(
    `INSERT INTO audit_log (id, timestamp, actor_type, actor_id, action, entity_type, entity_id, agent_id, run_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, now, entry.actorType, entry.actorId ?? null, entry.action,
    entry.entityType, entry.entityId ?? null, entry.agentId ?? null,
    entry.runId ?? null, detailsJson, now
  )
  let details: Record<string, unknown> = {}
  try { details = JSON.parse(detailsJson) } catch { /* ignore */ }
  return {
    id, timestamp: now, actorType: entry.actorType, actorId: entry.actorId ?? null,
    action: entry.action, entityType: entry.entityType, entityId: entry.entityId ?? null,
    agentId: entry.agentId ?? null, runId: entry.runId ?? null, details, createdAt: now,
  }
}

export interface AuditFilters {
  entityType?: string
  entityId?: string
  agentId?: string
  actorType?: AuditActorType
  action?: string
  runId?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
}

export function getAuditLog(filters?: AuditFilters, db = getDb()): AuditEntry[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.entityType) { conditions.push('entity_type = ?'); params.push(filters.entityType) }
  if (filters?.entityId) { conditions.push('entity_id = ?'); params.push(filters.entityId) }
  if (filters?.agentId) { conditions.push('agent_id = ?'); params.push(filters.agentId) }
  if (filters?.actorType) { conditions.push('actor_type = ?'); params.push(filters.actorType) }
  if (filters?.action) { conditions.push('action = ?'); params.push(filters.action) }
  if (filters?.runId) { conditions.push('run_id = ?'); params.push(filters.runId) }
  if (filters?.since) { conditions.push('timestamp >= ?'); params.push(filters.since) }
  if (filters?.until) { conditions.push('timestamp <= ?'); params.push(filters.until) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters?.limit ?? 100
  const offset = filters?.offset ?? 0

  const rows = db.prepare(
    `SELECT * FROM audit_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as AuditRow[]

  return rows.map(rowToEntry)
}

export function getAuditForEntity(entityType: string, entityId: string, db = getDb()): AuditEntry[] {
  return getAuditLog({ entityType, entityId }, db)
}

export function getAuditForRun(runId: string, db = getDb()): AuditEntry[] {
  return getAuditLog({ runId }, db)
}

export function getAuditCount(filters?: AuditFilters, db = getDb()): number {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.entityType) { conditions.push('entity_type = ?'); params.push(filters.entityType) }
  if (filters?.entityId) { conditions.push('entity_id = ?'); params.push(filters.entityId) }
  if (filters?.agentId) { conditions.push('agent_id = ?'); params.push(filters.agentId) }
  if (filters?.actorType) { conditions.push('actor_type = ?'); params.push(filters.actorType) }
  if (filters?.action) { conditions.push('action = ?'); params.push(filters.action) }
  if (filters?.runId) { conditions.push('run_id = ?'); params.push(filters.runId) }
  if (filters?.since) { conditions.push('timestamp >= ?'); params.push(filters.since) }
  if (filters?.until) { conditions.push('timestamp <= ?'); params.push(filters.until) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const row = db.prepare(`SELECT COUNT(*) as count FROM audit_log ${where}`).get(...params) as { count: number }
  return row.count
}
