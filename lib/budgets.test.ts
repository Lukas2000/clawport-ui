import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getBudgets,
  getBudget,
  setBudget,
  checkBudget,
  recordSpend,
  removeBudget,
} from './budgets'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('budgets', () => {
  it('returns null for unknown agent', () => {
    expect(getBudget('unknown', db)).toBeNull()
  })

  it('sets a budget', () => {
    const budget = setBudget('agent-1', 10000, db)
    expect(budget.agentId).toBe('agent-1')
    expect(budget.monthlyLimitCents).toBe(10000)
    expect(budget.currentMonthSpentCents).toBe(0)
  })

  it('sets null limit (unlimited)', () => {
    const budget = setBudget('agent-1', null, db)
    expect(budget.monthlyLimitCents).toBeNull()
  })

  it('updates existing budget', () => {
    setBudget('agent-1', 5000, db)
    const updated = setBudget('agent-1', 10000, db)
    expect(updated.monthlyLimitCents).toBe(10000)
  })

  it('lists all budgets', () => {
    setBudget('a1', 1000, db)
    setBudget('a2', 2000, db)
    expect(getBudgets(db).length).toBe(2)
  })

  it('checkBudget returns allowed for no budget', () => {
    const result = checkBudget('unknown', db)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBeNull()
    expect(result.spent).toBe(0)
  })

  it('checkBudget returns allowed for unlimited budget', () => {
    setBudget('agent-1', null, db)
    const result = checkBudget('agent-1', db)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBeNull()
  })

  it('checkBudget returns allowed when under limit', () => {
    setBudget('agent-1', 10000, db)
    recordSpend('agent-1', 5000, db)
    const result = checkBudget('agent-1', db)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(5000)
    expect(result.spent).toBe(5000)
  })

  it('checkBudget returns not allowed when over limit', () => {
    setBudget('agent-1', 1000, db)
    recordSpend('agent-1', 1000, db)
    const result = checkBudget('agent-1', db)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('recordSpend accumulates', () => {
    setBudget('agent-1', 10000, db)
    recordSpend('agent-1', 100, db)
    recordSpend('agent-1', 200, db)
    const budget = getBudget('agent-1', db)!
    expect(budget.currentMonthSpentCents).toBe(300)
  })

  it('recordSpend creates budget row if missing', () => {
    recordSpend('agent-1', 500, db)
    const budget = getBudget('agent-1', db)
    expect(budget).not.toBeNull()
    expect(budget!.currentMonthSpentCents).toBe(500)
    expect(budget!.monthlyLimitCents).toBeNull()
  })

  it('removes a budget', () => {
    setBudget('agent-1', 5000, db)
    expect(removeBudget('agent-1', db)).toBe(true)
    expect(getBudget('agent-1', db)).toBeNull()
  })

  it('remove returns false for missing budget', () => {
    expect(removeBudget('nonexistent', db)).toBe(false)
  })
})
