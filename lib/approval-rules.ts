import { getDb } from './db'
import { generateId } from './id'
import type { ApprovalRule } from './types'

interface RuleRow {
  id: string
  name: string
  trigger_condition: string
  description: string
  enabled: number
  created_at: string
}

function rowToRule(row: RuleRow): ApprovalRule {
  return {
    id: row.id,
    name: row.name,
    triggerCondition: row.trigger_condition,
    description: row.description,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  }
}

export function getApprovalRules(db = getDb()): ApprovalRule[] {
  const rows = db.prepare('SELECT * FROM approval_rules ORDER BY created_at DESC').all() as RuleRow[]
  return rows.map(rowToRule)
}

export function getApprovalRule(id: string, db = getDb()): ApprovalRule | null {
  const row = db.prepare('SELECT * FROM approval_rules WHERE id = ?').get(id) as RuleRow | undefined
  return row ? rowToRule(row) : null
}

export function createApprovalRule(
  data: { name: string; triggerCondition: string; description?: string },
  db = getDb()
): ApprovalRule {
  const id = generateId()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO approval_rules (id, name, trigger_condition, description, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, data.name, data.triggerCondition, data.description ?? '', now)
  return { id, name: data.name, triggerCondition: data.triggerCondition, description: data.description ?? '', enabled: true, createdAt: now }
}

export function updateApprovalRule(
  id: string,
  data: { name?: string; triggerCondition?: string; description?: string; enabled?: boolean },
  db = getDb()
): ApprovalRule | null {
  const existing = getApprovalRule(id, db)
  if (!existing) return null

  const name = data.name ?? existing.name
  const triggerCondition = data.triggerCondition ?? existing.triggerCondition
  const description = data.description ?? existing.description
  const enabled = data.enabled ?? existing.enabled

  db.prepare(
    'UPDATE approval_rules SET name = ?, trigger_condition = ?, description = ?, enabled = ? WHERE id = ?'
  ).run(name, triggerCondition, description, enabled ? 1 : 0, id)

  return { ...existing, name, triggerCondition, description, enabled }
}

export function deleteApprovalRule(id: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM approval_rules WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Check if an action requires approval based on enabled rules.
 * triggerCondition is matched as a simple string prefix against the action.
 */
export function checkApprovalRequired(
  action: string,
  context: Record<string, unknown> = {},
  db = getDb()
): ApprovalRule | null {
  const rules = db.prepare(
    'SELECT * FROM approval_rules WHERE enabled = 1 ORDER BY created_at ASC'
  ).all() as RuleRow[]

  for (const row of rules) {
    const rule = rowToRule(row)
    // Simple prefix matching for trigger conditions
    if (action.startsWith(rule.triggerCondition)) {
      return rule
    }
    // Check for budget_threshold rules
    if (rule.triggerCondition === 'budget_threshold' && typeof context.costCents === 'number') {
      const threshold = parseInt(rule.description, 10)
      if (!isNaN(threshold) && (context.costCents as number) > threshold) {
        return rule
      }
    }
  }

  return null
}
