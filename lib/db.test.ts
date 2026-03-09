import { describe, it, expect, afterEach } from 'vitest'
import { createTestDb } from './db'
import type Database from 'better-sqlite3'

describe('db', () => {
  let db: Database.Database

  afterEach(() => {
    if (db) db.close()
  })

  it('creates all tables', () => {
    db = createTestDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    const names = tables.map((t) => t.name)
    expect(names).toContain('projects')
    expect(names).toContain('tasks')
    expect(names).toContain('task_comments')
    expect(names).toContain('approvals')
  })

  it('enforces foreign keys', () => {
    db = createTestDb()
    expect(() => {
      db.prepare(
        "INSERT INTO tasks (id, title, project_id) VALUES ('t1', 'Test', 'nonexistent')"
      ).run()
    }).toThrow()
  })

  it('enforces status constraints on projects', () => {
    db = createTestDb()
    expect(() => {
      db.prepare(
        "INSERT INTO projects (id, name, status) VALUES ('p1', 'Test', 'invalid')"
      ).run()
    }).toThrow()
  })

  it('enforces priority constraints on tasks', () => {
    db = createTestDb()
    expect(() => {
      db.prepare(
        "INSERT INTO tasks (id, title, priority) VALUES ('t1', 'Test', 'critical')"
      ).run()
    }).toThrow()
  })

  it('allows valid inserts', () => {
    db = createTestDb()
    db.prepare("INSERT INTO projects (id, name) VALUES ('p1', 'Project Alpha')").run()
    db.prepare(
      "INSERT INTO tasks (id, title, project_id) VALUES ('t1', 'Task One', 'p1')"
    ).run()
    db.prepare(
      "INSERT INTO task_comments (id, task_id, author_type, content) VALUES ('c1', 't1', 'operator', 'Hello')"
    ).run()
    db.prepare(
      "INSERT INTO approvals (id, title) VALUES ('a1', 'Approve deploy')"
    ).run()

    const tasks = db.prepare('SELECT * FROM tasks').all()
    expect(tasks).toHaveLength(1)
  })

  it('cascades task_comments on task delete', () => {
    db = createTestDb()
    db.prepare("INSERT INTO tasks (id, title) VALUES ('t1', 'Task')").run()
    db.prepare(
      "INSERT INTO task_comments (id, task_id, author_type, content) VALUES ('c1', 't1', 'agent', 'Note')"
    ).run()
    db.prepare("DELETE FROM tasks WHERE id = 't1'").run()
    const comments = db.prepare('SELECT * FROM task_comments').all()
    expect(comments).toHaveLength(0)
  })

  it('sets project_id to null on project delete', () => {
    db = createTestDb()
    db.prepare("INSERT INTO projects (id, name) VALUES ('p1', 'Proj')").run()
    db.prepare(
      "INSERT INTO tasks (id, title, project_id) VALUES ('t1', 'Task', 'p1')"
    ).run()
    db.prepare("DELETE FROM projects WHERE id = 'p1'").run()
    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get('t1') as {
      project_id: string | null
    }
    expect(task.project_id).toBeNull()
  })
})
