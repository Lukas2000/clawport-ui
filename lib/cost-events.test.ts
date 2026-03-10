import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getCostEvents,
  recordCostEvent,
  getCostEvent,
  getCostsByAgent,
} from './cost-events'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('cost events', () => {
  it('records a cost event', () => {
    const event = recordCostEvent({
      agentId: 'agent-1',
      model: 'claude-sonnet-4-6',
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 25,
    }, db)
    expect(event.agentId).toBe('agent-1')
    expect(event.model).toBe('claude-sonnet-4-6')
    expect(event.inputTokens).toBe(1000)
    expect(event.costCents).toBe(25)
    expect(event.provider).toBe('anthropic')
  })

  it('records with optional fields', () => {
    const event = recordCostEvent({
      agentId: 'agent-1',
      runId: 'run-1',
      taskId: 'task-1',
      projectId: 'proj-1',
      goalId: 'goal-1',
      provider: 'openai',
      model: 'gpt-4o',
      inputTokens: 500,
      outputTokens: 200,
      cachedInputTokens: 100,
      costCents: 10,
    }, db)
    expect(event.runId).toBe('run-1')
    expect(event.taskId).toBe('task-1')
    expect(event.cachedInputTokens).toBe(100)
    expect(event.provider).toBe('openai')
  })

  it('gets event by id', () => {
    const event = recordCostEvent({
      agentId: 'agent-1',
      model: 'claude-sonnet-4-6',
      inputTokens: 100,
      outputTokens: 50,
      costCents: 5,
    }, db)
    const fetched = getCostEvent(event.id, db)
    expect(fetched).not.toBeNull()
    expect(fetched!.id).toBe(event.id)
  })

  it('lists events with filters', () => {
    recordCostEvent({ agentId: 'a1', model: 'm1', inputTokens: 100, outputTokens: 50, costCents: 5 }, db)
    recordCostEvent({ agentId: 'a2', model: 'm1', inputTokens: 200, outputTokens: 100, costCents: 10 }, db)
    recordCostEvent({ agentId: 'a1', model: 'm2', inputTokens: 300, outputTokens: 150, costCents: 15 }, db)

    expect(getCostEvents(undefined, db).length).toBe(3)
    expect(getCostEvents({ agentId: 'a1' }, db).length).toBe(2)
    expect(getCostEvents({ limit: 1 }, db).length).toBe(1)
  })

  it('aggregates by agent', () => {
    recordCostEvent({ agentId: 'a1', model: 'm1', inputTokens: 100, outputTokens: 50, costCents: 10 }, db)
    recordCostEvent({ agentId: 'a1', model: 'm1', inputTokens: 100, outputTokens: 50, costCents: 20 }, db)
    recordCostEvent({ agentId: 'a2', model: 'm1', inputTokens: 100, outputTokens: 50, costCents: 5 }, db)

    const byAgent = getCostsByAgent(db)
    expect(byAgent.length).toBe(2)
    expect(byAgent[0].agentId).toBe('a1')
    expect(byAgent[0].totalCents).toBe(30)
  })
})
