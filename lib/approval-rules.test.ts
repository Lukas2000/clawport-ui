import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getApprovalRules, getApprovalRule, createApprovalRule,
  updateApprovalRule, deleteApprovalRule, checkApprovalRequired,
} from './approval-rules'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('createApprovalRule', () => {
  it('creates a rule with all fields', () => {
    const rule = createApprovalRule({
      name: 'High cost review',
      triggerCondition: 'budget_threshold',
      description: '1000',
    }, db)

    expect(rule.id).toBeTruthy()
    expect(rule.name).toBe('High cost review')
    expect(rule.triggerCondition).toBe('budget_threshold')
    expect(rule.description).toBe('1000')
    expect(rule.enabled).toBe(true)
  })
})

describe('getApprovalRules', () => {
  it('lists all rules', () => {
    createApprovalRule({ name: 'Rule A', triggerCondition: 'task.delete' }, db)
    createApprovalRule({ name: 'Rule B', triggerCondition: 'agent.config' }, db)

    const rules = getApprovalRules(db)
    expect(rules).toHaveLength(2)
  })
})

describe('getApprovalRule', () => {
  it('returns a specific rule', () => {
    const created = createApprovalRule({ name: 'Test', triggerCondition: 'test' }, db)
    const found = getApprovalRule(created.id, db)
    expect(found).not.toBeNull()
    expect(found!.name).toBe('Test')
  })

  it('returns null for non-existent', () => {
    expect(getApprovalRule('nope', db)).toBeNull()
  })
})

describe('updateApprovalRule', () => {
  it('updates fields', () => {
    const rule = createApprovalRule({ name: 'Old', triggerCondition: 'old' }, db)
    const updated = updateApprovalRule(rule.id, { name: 'New', enabled: false }, db)

    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('New')
    expect(updated!.enabled).toBe(false)
    expect(updated!.triggerCondition).toBe('old')
  })

  it('returns null for non-existent', () => {
    expect(updateApprovalRule('nope', { name: 'X' }, db)).toBeNull()
  })
})

describe('deleteApprovalRule', () => {
  it('deletes a rule', () => {
    const rule = createApprovalRule({ name: 'Del', triggerCondition: 'del' }, db)
    expect(deleteApprovalRule(rule.id, db)).toBe(true)
    expect(getApprovalRule(rule.id, db)).toBeNull()
  })

  it('returns false for non-existent', () => {
    expect(deleteApprovalRule('nope', db)).toBe(false)
  })
})

describe('checkApprovalRequired', () => {
  it('matches by action prefix', () => {
    createApprovalRule({ name: 'Config change', triggerCondition: 'agent.config' }, db)

    expect(checkApprovalRequired('agent.config.update', {}, db)).not.toBeNull()
    expect(checkApprovalRequired('task.create', {}, db)).toBeNull()
  })

  it('skips disabled rules', () => {
    const rule = createApprovalRule({ name: 'Disabled', triggerCondition: 'task' }, db)
    updateApprovalRule(rule.id, { enabled: false }, db)

    expect(checkApprovalRequired('task.delete', {}, db)).toBeNull()
  })

  it('matches budget_threshold with cost context', () => {
    createApprovalRule({
      name: 'Budget review',
      triggerCondition: 'budget_threshold',
      description: '500',
    }, db)

    expect(checkApprovalRequired('spend', { costCents: 600 }, db)).not.toBeNull()
    expect(checkApprovalRequired('spend', { costCents: 400 }, db)).toBeNull()
  })
})
