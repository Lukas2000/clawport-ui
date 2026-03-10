import { getDb } from './db'
import { generateId } from './id'
import type { Approval, ApprovalStatus } from './types'

interface ApprovalRow {
  id: string
  title: string
  description: string
  requested_by_agent_id: string | null
  status: string
  decision_note: string | null
  task_id: string | null
  approval_type: string | null
  context: string | null
  decided_by: string | null
  created_at: string
  decided_at: string | null
}

function rowToApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requestedByAgentId: row.requested_by_agent_id,
    status: row.status as ApprovalStatus,
    decisionNote: row.decision_note,
    taskId: row.task_id,
    approvalType: row.approval_type ?? 'manual',
    context: row.context ?? '{}',
    decidedBy: row.decided_by,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  }
}

export function getApprovals(status?: ApprovalStatus, db = getDb()): Approval[] {
  if (status) {
    const rows = db
      .prepare('SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC')
      .all(status) as ApprovalRow[]
    return rows.map(rowToApproval)
  }
  const rows = db
    .prepare('SELECT * FROM approvals ORDER BY created_at DESC')
    .all() as ApprovalRow[]
  return rows.map(rowToApproval)
}

export function createApproval(
  data: {
    title: string
    description?: string
    requestedByAgentId?: string | null
    taskId?: string | null
  },
  db = getDb()
): Approval {
  const id = generateId()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO approvals (id, title, description, requested_by_agent_id, task_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, data.title, data.description ?? '', data.requestedByAgentId ?? null, data.taskId ?? null, now)
  return {
    id,
    title: data.title,
    description: data.description ?? '',
    requestedByAgentId: data.requestedByAgentId ?? null,
    status: 'pending',
    decisionNote: null,
    taskId: data.taskId ?? null,
    approvalType: 'manual',
    context: '{}',
    decidedBy: null,
    createdAt: now,
    decidedAt: null,
  }
}

export function decideApproval(
  id: string,
  status: 'approved' | 'rejected' | 'revision_requested',
  note?: string,
  decidedBy?: string,
  db = getDb()
): Approval | null {
  const now = new Date().toISOString()
  db.prepare(
    'UPDATE approvals SET status = ?, decision_note = ?, decided_by = ?, decided_at = ? WHERE id = ?'
  ).run(status, note ?? null, decidedBy ?? null, now, id)
  const row = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as ApprovalRow | undefined
  return row ? rowToApproval(row) : null
}
