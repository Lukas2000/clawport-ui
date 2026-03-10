import { getDb } from './db'
import { generateId } from './id'
import type { IssueLabel } from './types'

interface LabelRow {
  id: string
  name: string
  color: string
  created_at: string
}

function rowToLabel(row: LabelRow): IssueLabel {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

export function getLabels(db = getDb()): IssueLabel[] {
  const rows = db.prepare('SELECT * FROM issue_labels ORDER BY name ASC').all() as LabelRow[]
  return rows.map(rowToLabel)
}

export function getLabel(id: string, db = getDb()): IssueLabel | null {
  const row = db.prepare('SELECT * FROM issue_labels WHERE id = ?').get(id) as LabelRow | undefined
  return row ? rowToLabel(row) : null
}

export function createLabel(
  data: { name: string; color?: string },
  db = getDb()
): IssueLabel {
  const id = generateId()
  db.prepare(
    'INSERT INTO issue_labels (id, name, color) VALUES (?, ?, ?)'
  ).run(id, data.name, data.color ?? '#6B7280')
  return getLabel(id, db)!
}

export function updateLabel(
  id: string,
  data: Partial<{ name: string; color: string }>,
  db = getDb()
): IssueLabel | null {
  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
  if (fields.length === 0) return getLabel(id, db)
  values.push(id)
  db.prepare(`UPDATE issue_labels SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getLabel(id, db)
}

export function deleteLabel(id: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM issue_labels WHERE id = ?').run(id)
  return result.changes > 0
}

// ── Task-Label associations ──────────────────────────────────

export function getTaskLabelIds(taskId: string, db = getDb()): string[] {
  const rows = db.prepare(
    'SELECT label_id FROM task_labels WHERE task_id = ?'
  ).all(taskId) as { label_id: string }[]
  return rows.map(r => r.label_id)
}

export function getTaskLabels(taskId: string, db = getDb()): IssueLabel[] {
  const rows = db.prepare(
    `SELECT l.* FROM issue_labels l
     JOIN task_labels tl ON tl.label_id = l.id
     WHERE tl.task_id = ?
     ORDER BY l.name ASC`
  ).all(taskId) as LabelRow[]
  return rows.map(rowToLabel)
}

export function addLabelToTask(taskId: string, labelId: string, db = getDb()): boolean {
  try {
    db.prepare(
      'INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)'
    ).run(taskId, labelId)
    return true
  } catch {
    return false
  }
}

export function removeLabelFromTask(taskId: string, labelId: string, db = getDb()): boolean {
  const result = db.prepare(
    'DELETE FROM task_labels WHERE task_id = ? AND label_id = ?'
  ).run(taskId, labelId)
  return result.changes > 0
}
