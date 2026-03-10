import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getHeartbeatConfigs,
  getHeartbeatConfig,
  upsertHeartbeatConfig,
  getHeartbeatRuns,
  queueHeartbeatRun,
  startNextQueuedRun,
  completeHeartbeatRun,
  getDueHeartbeats,
  scheduleNextBeat,
  reapOrphanedRuns,
} from './heartbeat'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('heartbeat config', () => {
  it('returns null for unknown agent', () => {
    expect(getHeartbeatConfig('unknown', db)).toBeNull()
  })

  it('creates a config', () => {
    const config = upsertHeartbeatConfig('agent-1', { enabled: true, intervalMinutes: 30 }, db)
    expect(config.agentId).toBe('agent-1')
    expect(config.enabled).toBe(true)
    expect(config.intervalMinutes).toBe(30)
    expect(config.maxConcurrentRuns).toBe(1)
  })

  it('updates existing config', () => {
    upsertHeartbeatConfig('agent-1', { enabled: false }, db)
    const updated = upsertHeartbeatConfig('agent-1', { enabled: true }, db)
    expect(updated.enabled).toBe(true)
  })

  it('lists configs', () => {
    upsertHeartbeatConfig('a1', { enabled: true }, db)
    upsertHeartbeatConfig('a2', { enabled: false }, db)
    expect(getHeartbeatConfigs(db).length).toBe(2)
  })
})

describe('heartbeat runs', () => {
  it('queues a run', () => {
    const run = queueHeartbeatRun('agent-1', 'scheduled', null, db)
    expect(run.agentId).toBe('agent-1')
    expect(run.status).toBe('queued')
    expect(run.trigger).toBe('scheduled')
  })

  it('lists runs for agent', () => {
    queueHeartbeatRun('agent-1', 'scheduled', null, db)
    queueHeartbeatRun('agent-1', 'manual', null, db)
    expect(getHeartbeatRuns('agent-1', 50, db).length).toBe(2)
  })

  it('starts next queued run', () => {
    upsertHeartbeatConfig('agent-1', { maxConcurrentRuns: 1 }, db)
    queueHeartbeatRun('agent-1', 'scheduled', null, db)
    const started = startNextQueuedRun('agent-1', db)
    expect(started).not.toBeNull()
    expect(started!.status).toBe('running')
    expect(started!.startedAt).not.toBeNull()
  })

  it('respects concurrency limit', () => {
    upsertHeartbeatConfig('agent-1', { maxConcurrentRuns: 1 }, db)
    queueHeartbeatRun('agent-1', 'scheduled', null, db)
    queueHeartbeatRun('agent-1', 'manual', null, db)

    const first = startNextQueuedRun('agent-1', db)
    expect(first).not.toBeNull()

    const second = startNextQueuedRun('agent-1', db)
    expect(second).toBeNull() // at capacity
  })

  it('completes a run successfully', () => {
    upsertHeartbeatConfig('agent-1', {}, db)
    const run = queueHeartbeatRun('agent-1', 'scheduled', null, db)
    db.prepare(`UPDATE heartbeat_runs SET status = 'running', started_at = datetime('now') WHERE id = ?`).run(run.id)

    const completed = completeHeartbeatRun(run.id, {
      status: 'succeeded',
      tasksChecked: 3,
      tasksExecuted: 1,
    }, db)
    expect(completed!.status).toBe('succeeded')
    expect(completed!.tasksChecked).toBe(3)

    // Config should reset errors
    const config = getHeartbeatConfig('agent-1', db)!
    expect(config.consecutiveErrors).toBe(0)
  })

  it('completes a run with failure', () => {
    upsertHeartbeatConfig('agent-1', {}, db)
    const run = queueHeartbeatRun('agent-1', 'scheduled', null, db)
    db.prepare(`UPDATE heartbeat_runs SET status = 'running', started_at = datetime('now') WHERE id = ?`).run(run.id)

    completeHeartbeatRun(run.id, {
      status: 'failed',
      error: 'API timeout',
    }, db)

    const config = getHeartbeatConfig('agent-1', db)!
    expect(config.consecutiveErrors).toBe(1)
    expect(config.lastError).toBe('API timeout')
  })
})

describe('scheduling', () => {
  it('getDueHeartbeats returns enabled configs with no next_beat_at', () => {
    upsertHeartbeatConfig('a1', { enabled: true }, db)
    upsertHeartbeatConfig('a2', { enabled: false }, db)
    const due = getDueHeartbeats(db)
    expect(due.length).toBe(1)
    expect(due[0].agentId).toBe('a1')
  })

  it('scheduleNextBeat sets future timestamp', () => {
    upsertHeartbeatConfig('agent-1', { enabled: true, intervalMinutes: 60 }, db)
    scheduleNextBeat('agent-1', db)
    const config = getHeartbeatConfig('agent-1', db)!
    expect(config.nextBeatAt).not.toBeNull()
    const next = new Date(config.nextBeatAt!).getTime()
    expect(next).toBeGreaterThan(Date.now())
  })
})

describe('orphan reaping', () => {
  it('reaps stale running runs', () => {
    const run = queueHeartbeatRun('agent-1', 'scheduled', null, db)
    // Simulate a run that started 60 minutes ago
    const pastTime = new Date(Date.now() - 60 * 60000).toISOString()
    db.prepare(`UPDATE heartbeat_runs SET status = 'running', started_at = ? WHERE id = ?`).run(pastTime, run.id)

    const reaped = reapOrphanedRuns(30, db)
    expect(reaped).toBe(1)

    const updated = getHeartbeatRuns('agent-1', 50, db)[0]
    expect(updated.status).toBe('timed_out')
  })

  it('does not reap recent running runs', () => {
    const run = queueHeartbeatRun('agent-1', 'scheduled', null, db)
    // Set started_at to 5 minutes ago (well within 30 min window)
    const recentTime = new Date(Date.now() - 5 * 60000).toISOString()
    db.prepare(`UPDATE heartbeat_runs SET status = 'running', started_at = ? WHERE id = ?`).run(recentTime, run.id)

    const reaped = reapOrphanedRuns(30, db)
    expect(reaped).toBe(0)
  })
})
