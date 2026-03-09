import { getDb } from './db'
import { generateId } from './id'
import type { TaskComment } from './types'

interface CommentRow {
  id: string
  task_id: string
  author_type: string
  author_id: string | null
  content: string
  created_at: string
}

function rowToComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorType: row.author_type as TaskComment['authorType'],
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  }
}

export function getComments(taskId: string, db = getDb()): TaskComment[] {
  const rows = db
    .prepare('SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC')
    .all(taskId) as CommentRow[]
  return rows.map(rowToComment)
}

export function addComment(
  data: { taskId: string; authorType: 'agent' | 'operator'; authorId?: string | null; content: string },
  db = getDb()
): TaskComment {
  const id = generateId()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO task_comments (id, task_id, author_type, author_id, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, data.taskId, data.authorType, data.authorId ?? null, data.content, now)
  return {
    id,
    taskId: data.taskId,
    authorType: data.authorType,
    authorId: data.authorId ?? null,
    content: data.content,
    createdAt: now,
  }
}
