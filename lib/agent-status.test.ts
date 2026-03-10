import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getAgentStatuses,
  getAgentStatus,
  ensureAgentStatus,
  updateAgentStatus,
  recordTaskCompletion,
  recordTokenUsage,
} from './agent-status'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('agent status', () => {
  it('returns null for unknown agent', () => {
    expect(getAgentStatus('unknown', db)).toBeNull()
  })

  it('ensures agent status with defaults', () => {
    const status = ensureAgentStatus('agent-1', db)
    expect(status.agentId).toBe('agent-1')
    expect(status.status).toBe('idle')
    expect(status.tasksCompletedTotal).toBe(0)
    expect(status.totalCostCents).toBe(0)
  })

  it('ensure is idempotent', () => {
    ensureAgentStatus('agent-1', db)
    const status = ensureAgentStatus('agent-1', db)
    expect(status.agentId).toBe('agent-1')
  })

  it('lists all statuses', () => {
    ensureAgentStatus('a1', db)
    ensureAgentStatus('a2', db)
    expect(getAgentStatuses(db).length).toBe(2)
  })

  it('updates status fields', () => {
    ensureAgentStatus('agent-1', db)
    const updated = updateAgentStatus('agent-1', {
      status: 'working',
      currentTaskId: 'task-1',
      lastActiveAt: new Date().toISOString(),
    }, db)
    expect(updated.status).toBe('working')
    expect(updated.currentTaskId).toBe('task-1')
  })

  it('records task completion', () => {
    ensureAgentStatus('agent-1', db)
    recordTaskCompletion('agent-1', true, db)
    recordTaskCompletion('agent-1', true, db)
    recordTaskCompletion('agent-1', false, db)
    const status = getAgentStatus('agent-1', db)!
    expect(status.tasksCompletedTotal).toBe(2)
    expect(status.tasksFailedTotal).toBe(1)
  })

  it('records token usage', () => {
    ensureAgentStatus('agent-1', db)
    recordTokenUsage('agent-1', 1000, 500, 25, db)
    recordTokenUsage('agent-1', 2000, 1000, 50, db)
    const status = getAgentStatus('agent-1', db)!
    expect(status.totalInputTokens).toBe(3000)
    expect(status.totalOutputTokens).toBe(1500)
    expect(status.totalCostCents).toBe(75)
  })
})
