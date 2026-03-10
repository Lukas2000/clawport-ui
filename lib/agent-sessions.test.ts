import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getLatestSession,
  saveSession,
  getAgentSessions,
  deleteSession,
} from './agent-sessions'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('agent sessions', () => {
  it('returns null for unknown agent', () => {
    expect(getLatestSession('unknown', undefined, db)).toBeNull()
  })

  it('creates a session', () => {
    const session = saveSession({
      agentId: 'agent-1',
      sessionType: 'heartbeat',
      stateData: '{"key":"value"}',
    }, db)
    expect(session.agentId).toBe('agent-1')
    expect(session.sessionType).toBe('heartbeat')
    expect(session.stateData).toBe('{"key":"value"}')
  })

  it('retrieves latest session', () => {
    saveSession({ agentId: 'agent-1', stateData: '{"v":1}' }, db)
    const latest = getLatestSession('agent-1', undefined, db)
    expect(latest).not.toBeNull()
    expect(latest!.stateData).toBe('{"v":1}')
  })

  it('upserts on same agent_id + task_key', () => {
    saveSession({ agentId: 'agent-1', taskKey: 'task-1', stateData: '{"v":1}' }, db)
    saveSession({ agentId: 'agent-1', taskKey: 'task-1', stateData: '{"v":2}' }, db)
    const sessions = getAgentSessions('agent-1', db)
    expect(sessions.length).toBe(1)
    expect(sessions[0].stateData).toBe('{"v":2}')
  })

  it('creates separate sessions for different task keys', () => {
    saveSession({ agentId: 'agent-1', taskKey: 'task-1' }, db)
    saveSession({ agentId: 'agent-1', taskKey: 'task-2' }, db)
    expect(getAgentSessions('agent-1', db).length).toBe(2)
  })

  it('filters by task key', () => {
    saveSession({ agentId: 'agent-1', taskKey: 'task-1', stateData: '{"t":1}' }, db)
    saveSession({ agentId: 'agent-1', taskKey: 'task-2', stateData: '{"t":2}' }, db)
    const session = getLatestSession('agent-1', 'task-1', db)
    expect(session!.stateData).toBe('{"t":1}')
  })

  it('deletes a session', () => {
    const session = saveSession({ agentId: 'agent-1' }, db)
    expect(deleteSession(session.id, db)).toBe(true)
    expect(getAgentSessions('agent-1', db).length).toBe(0)
  })

  it('delete returns false for missing session', () => {
    expect(deleteSession('nonexistent', db)).toBe(false)
  })
})
