import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import { logAudit, getAuditLog, getAuditForEntity, getAuditForRun, getAuditCount } from './audit'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('logAudit', () => {
  it('creates an audit entry with all fields', () => {
    const entry = logAudit({
      actorType: 'operator',
      actorId: 'user-1',
      action: 'task.created',
      entityType: 'task',
      entityId: 'task-1',
      agentId: 'agent-1',
      details: { title: 'New task' },
    }, db)

    expect(entry.id).toBeTruthy()
    expect(entry.actorType).toBe('operator')
    expect(entry.actorId).toBe('user-1')
    expect(entry.action).toBe('task.created')
    expect(entry.entityType).toBe('task')
    expect(entry.entityId).toBe('task-1')
    expect(entry.agentId).toBe('agent-1')
    expect(entry.details).toEqual({ title: 'New task' })
  })

  it('creates entry with minimal fields', () => {
    const entry = logAudit({
      actorType: 'system',
      action: 'heartbeat.tick',
      entityType: 'heartbeat',
    }, db)

    expect(entry.actorType).toBe('system')
    expect(entry.actorId).toBeNull()
    expect(entry.entityId).toBeNull()
    expect(entry.agentId).toBeNull()
    expect(entry.runId).toBeNull()
    expect(entry.details).toEqual({})
  })
})

describe('getAuditLog', () => {
  it('returns all entries', () => {
    logAudit({ actorType: 'system', action: 'first', entityType: 'test' }, db)
    logAudit({ actorType: 'system', action: 'second', entityType: 'test' }, db)

    const entries = getAuditLog(undefined, db)
    expect(entries).toHaveLength(2)
    const actions = entries.map(e => e.action).sort()
    expect(actions).toEqual(['first', 'second'])
  })

  it('filters by entityType', () => {
    logAudit({ actorType: 'system', action: 'a', entityType: 'task' }, db)
    logAudit({ actorType: 'system', action: 'b', entityType: 'goal' }, db)

    const tasks = getAuditLog({ entityType: 'task' }, db)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].action).toBe('a')
  })

  it('filters by agentId', () => {
    logAudit({ actorType: 'agent', actorId: 'a1', action: 'run', entityType: 'task', agentId: 'a1' }, db)
    logAudit({ actorType: 'agent', actorId: 'a2', action: 'run', entityType: 'task', agentId: 'a2' }, db)

    const results = getAuditLog({ agentId: 'a1' }, db)
    expect(results).toHaveLength(1)
    expect(results[0].agentId).toBe('a1')
  })

  it('filters by action', () => {
    logAudit({ actorType: 'operator', action: 'task.created', entityType: 'task' }, db)
    logAudit({ actorType: 'operator', action: 'task.updated', entityType: 'task' }, db)

    const created = getAuditLog({ action: 'task.created' }, db)
    expect(created).toHaveLength(1)
  })

  it('respects limit and offset', () => {
    for (let i = 0; i < 5; i++) {
      logAudit({ actorType: 'system', action: `action-${i}`, entityType: 'test' }, db)
    }

    const page1 = getAuditLog({ limit: 2, offset: 0 }, db)
    expect(page1).toHaveLength(2)

    const page2 = getAuditLog({ limit: 2, offset: 2 }, db)
    expect(page2).toHaveLength(2)

    // No overlap
    expect(page1[0].id).not.toBe(page2[0].id)
  })

  it('filters by actorType', () => {
    logAudit({ actorType: 'operator', action: 'a', entityType: 'test' }, db)
    logAudit({ actorType: 'agent', action: 'b', entityType: 'test' }, db)
    logAudit({ actorType: 'system', action: 'c', entityType: 'test' }, db)

    const operators = getAuditLog({ actorType: 'operator' }, db)
    expect(operators).toHaveLength(1)
    expect(operators[0].action).toBe('a')
  })
})

describe('getAuditForEntity', () => {
  it('returns entries for a specific entity', () => {
    logAudit({ actorType: 'operator', action: 'task.created', entityType: 'task', entityId: 't1' }, db)
    logAudit({ actorType: 'operator', action: 'task.updated', entityType: 'task', entityId: 't1' }, db)
    logAudit({ actorType: 'operator', action: 'task.created', entityType: 'task', entityId: 't2' }, db)

    const entries = getAuditForEntity('task', 't1', db)
    expect(entries).toHaveLength(2)
    entries.forEach(e => expect(e.entityId).toBe('t1'))
  })
})

describe('getAuditForRun', () => {
  it('returns entries for a specific run', () => {
    logAudit({ actorType: 'system', action: 'run.start', entityType: 'heartbeat', runId: 'r1' }, db)
    logAudit({ actorType: 'system', action: 'run.complete', entityType: 'heartbeat', runId: 'r1' }, db)
    logAudit({ actorType: 'system', action: 'run.start', entityType: 'heartbeat', runId: 'r2' }, db)

    const entries = getAuditForRun('r1', db)
    expect(entries).toHaveLength(2)
    entries.forEach(e => expect(e.runId).toBe('r1'))
  })
})

describe('getAuditCount', () => {
  it('counts all entries', () => {
    logAudit({ actorType: 'system', action: 'a', entityType: 'test' }, db)
    logAudit({ actorType: 'system', action: 'b', entityType: 'test' }, db)

    expect(getAuditCount(undefined, db)).toBe(2)
  })

  it('counts with filters', () => {
    logAudit({ actorType: 'operator', action: 'a', entityType: 'task' }, db)
    logAudit({ actorType: 'system', action: 'b', entityType: 'goal' }, db)

    expect(getAuditCount({ entityType: 'task' }, db)).toBe(1)
    expect(getAuditCount({ actorType: 'system' }, db)).toBe(1)
  })
})
