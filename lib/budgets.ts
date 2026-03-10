import { getDb } from './db'
import type { AgentBudget, BudgetCheckResult } from './types'

interface BudgetRow {
  agent_id: string
  monthly_limit_cents: number | null
  current_month_spent_cents: number
  month_key: string
  updated_at: string
}

function rowToBudget(row: BudgetRow): AgentBudget {
  return {
    agentId: row.agent_id,
    monthlyLimitCents: row.monthly_limit_cents,
    currentMonthSpentCents: row.current_month_spent_cents,
    monthKey: row.month_key,
    updatedAt: row.updated_at,
  }
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getBudgets(db = getDb()): AgentBudget[] {
  const rows = db.prepare('SELECT * FROM agent_budgets ORDER BY agent_id').all() as BudgetRow[]
  return rows.map(rowToBudget)
}

export function getBudget(agentId: string, db = getDb()): AgentBudget | null {
  const row = db.prepare('SELECT * FROM agent_budgets WHERE agent_id = ?').get(agentId) as BudgetRow | undefined
  return row ? rowToBudget(row) : null
}

/**
 * Set a monthly budget for an agent. Pass null for limitCents to remove the limit (unlimited).
 */
export function setBudget(agentId: string, limitCents: number | null, db = getDb()): AgentBudget {
  const monthKey = currentMonthKey()
  db.prepare(
    `INSERT INTO agent_budgets (agent_id, monthly_limit_cents, month_key)
     VALUES (?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET
       monthly_limit_cents = excluded.monthly_limit_cents,
       updated_at = datetime('now')`
  ).run(agentId, limitCents, monthKey)
  return getBudget(agentId, db)!
}

/**
 * Check if an agent is within budget. Returns allowed:true if no limit set or under limit.
 */
export function checkBudget(agentId: string, db = getDb()): BudgetCheckResult {
  const budget = getBudget(agentId, db)
  if (!budget) {
    return { allowed: true, remaining: null, spent: 0, limit: null }
  }

  // Auto-reset stale month
  const monthKey = currentMonthKey()
  if (budget.monthKey !== monthKey) {
    db.prepare(
      `UPDATE agent_budgets SET current_month_spent_cents = 0, month_key = ?, updated_at = datetime('now') WHERE agent_id = ?`
    ).run(monthKey, agentId)
    return { allowed: true, remaining: budget.monthlyLimitCents, spent: 0, limit: budget.monthlyLimitCents }
  }

  if (budget.monthlyLimitCents === null) {
    return { allowed: true, remaining: null, spent: budget.currentMonthSpentCents, limit: null }
  }

  const remaining = budget.monthlyLimitCents - budget.currentMonthSpentCents
  return {
    allowed: budget.currentMonthSpentCents < budget.monthlyLimitCents,
    remaining: Math.max(0, remaining),
    spent: budget.currentMonthSpentCents,
    limit: budget.monthlyLimitCents,
  }
}

/**
 * Record spending for an agent. Auto-resets month if stale.
 */
export function recordSpend(agentId: string, cents: number, db = getDb()): void {
  const monthKey = currentMonthKey()

  // Ensure budget row exists
  db.prepare(
    `INSERT OR IGNORE INTO agent_budgets (agent_id, month_key) VALUES (?, ?)`
  ).run(agentId, monthKey)

  // Auto-reset stale month
  const budget = getBudget(agentId, db)!
  if (budget.monthKey !== monthKey) {
    db.prepare(
      `UPDATE agent_budgets SET current_month_spent_cents = ?, month_key = ?, updated_at = datetime('now') WHERE agent_id = ?`
    ).run(cents, monthKey, agentId)
  } else {
    db.prepare(
      `UPDATE agent_budgets SET current_month_spent_cents = current_month_spent_cents + ?, updated_at = datetime('now') WHERE agent_id = ?`
    ).run(cents, agentId)
  }
}

/**
 * Remove a budget (allows unlimited spending).
 */
export function removeBudget(agentId: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM agent_budgets WHERE agent_id = ?').run(agentId)
  return result.changes > 0
}
