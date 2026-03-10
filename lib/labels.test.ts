import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getLabels,
  getLabel,
  createLabel,
  updateLabel,
  deleteLabel,
  getTaskLabels,
  getTaskLabelIds,
  addLabelToTask,
  removeLabelFromTask,
} from './labels'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('labels CRUD', () => {
  it('creates a label with default color', () => {
    const label = createLabel({ name: 'bug' }, db)
    expect(label.name).toBe('bug')
    expect(label.color).toBe('#6B7280')
    expect(label.id).toBeTruthy()
  })

  it('creates a label with custom color', () => {
    const label = createLabel({ name: 'feature', color: '#3B82F6' }, db)
    expect(label.color).toBe('#3B82F6')
  })

  it('lists all labels sorted by name', () => {
    createLabel({ name: 'zzz' }, db)
    createLabel({ name: 'aaa' }, db)
    const labels = getLabels(db)
    expect(labels.length).toBe(2)
    expect(labels[0].name).toBe('aaa')
    expect(labels[1].name).toBe('zzz')
  })

  it('gets a label by id', () => {
    const created = createLabel({ name: 'test' }, db)
    const fetched = getLabel(created.id, db)
    expect(fetched).toEqual(created)
  })

  it('returns null for missing label', () => {
    expect(getLabel('nonexistent', db)).toBeNull()
  })

  it('updates a label name', () => {
    const label = createLabel({ name: 'old' }, db)
    const updated = updateLabel(label.id, { name: 'new' }, db)
    expect(updated?.name).toBe('new')
  })

  it('updates a label color', () => {
    const label = createLabel({ name: 'test' }, db)
    const updated = updateLabel(label.id, { color: '#FF0000' }, db)
    expect(updated?.color).toBe('#FF0000')
  })

  it('deletes a label', () => {
    const label = createLabel({ name: 'test' }, db)
    expect(deleteLabel(label.id, db)).toBe(true)
    expect(getLabel(label.id, db)).toBeNull()
  })

  it('returns false when deleting nonexistent label', () => {
    expect(deleteLabel('nonexistent', db)).toBe(false)
  })

  it('enforces unique name constraint', () => {
    createLabel({ name: 'unique' }, db)
    expect(() => createLabel({ name: 'unique' }, db)).toThrow()
  })
})

describe('task-label associations', () => {
  function makeTask(db: Database.Database): string {
    const id = `task-${Date.now()}-${Math.random()}`
    db.prepare(
      "INSERT INTO tasks (id, title, created_at, updated_at) VALUES (?, 'test', datetime('now'), datetime('now'))"
    ).run(id)
    return id
  }

  it('adds a label to a task', () => {
    const taskId = makeTask(db)
    const label = createLabel({ name: 'bug' }, db)
    expect(addLabelToTask(taskId, label.id, db)).toBe(true)

    const labels = getTaskLabels(taskId, db)
    expect(labels.length).toBe(1)
    expect(labels[0].name).toBe('bug')
  })

  it('gets label IDs for a task', () => {
    const taskId = makeTask(db)
    const l1 = createLabel({ name: 'a' }, db)
    const l2 = createLabel({ name: 'b' }, db)
    addLabelToTask(taskId, l1.id, db)
    addLabelToTask(taskId, l2.id, db)

    const ids = getTaskLabelIds(taskId, db)
    expect(ids).toContain(l1.id)
    expect(ids).toContain(l2.id)
  })

  it('does not duplicate label associations', () => {
    const taskId = makeTask(db)
    const label = createLabel({ name: 'test' }, db)
    addLabelToTask(taskId, label.id, db)
    addLabelToTask(taskId, label.id, db) // duplicate
    expect(getTaskLabels(taskId, db).length).toBe(1)
  })

  it('removes a label from a task', () => {
    const taskId = makeTask(db)
    const label = createLabel({ name: 'test' }, db)
    addLabelToTask(taskId, label.id, db)
    expect(removeLabelFromTask(taskId, label.id, db)).toBe(true)
    expect(getTaskLabels(taskId, db).length).toBe(0)
  })

  it('returns false when removing nonexistent association', () => {
    const taskId = makeTask(db)
    expect(removeLabelFromTask(taskId, 'nonexistent', db)).toBe(false)
  })

  it('cascades label deletion to task_labels', () => {
    const taskId = makeTask(db)
    const label = createLabel({ name: 'temp' }, db)
    addLabelToTask(taskId, label.id, db)
    deleteLabel(label.id, db)
    expect(getTaskLabels(taskId, db).length).toBe(0)
  })
})
