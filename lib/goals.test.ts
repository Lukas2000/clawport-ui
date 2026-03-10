import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from './db'
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalTree,
  getGoalAncestry,
  getGoalAncestryForProject,
  computeGoalProgress,
} from './goals'
import type Database from 'better-sqlite3'

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

describe('goals CRUD', () => {
  it('creates a goal with defaults', () => {
    const goal = createGoal({ title: 'Increase revenue' }, db)
    expect(goal.title).toBe('Increase revenue')
    expect(goal.type).toBe('goal')
    expect(goal.status).toBe('active')
    expect(goal.progress).toBe(0)
    expect(goal.currentValue).toBe(0)
    expect(goal.parentGoalId).toBeNull()
    expect(goal.ownerAgentId).toBeNull()
    expect(goal.id).toBeTruthy()
  })

  it('creates a goal with all fields', () => {
    const goal = createGoal({
      title: 'Launch v2',
      description: 'Ship major release',
      type: 'okr',
      parentGoalId: null,
      ownerAgentId: 'agent-1',
      targetValue: 100,
      targetDate: '2026-06-01',
    }, db)
    expect(goal.description).toBe('Ship major release')
    expect(goal.type).toBe('okr')
    expect(goal.ownerAgentId).toBe('agent-1')
    expect(goal.targetValue).toBe(100)
    expect(goal.targetDate).toBe('2026-06-01')
  })

  it('gets a goal by id', () => {
    const created = createGoal({ title: 'Test' }, db)
    const fetched = getGoal(created.id, db)
    expect(fetched).not.toBeNull()
    expect(fetched!.title).toBe('Test')
  })

  it('returns null for missing goal', () => {
    expect(getGoal('nonexistent', db)).toBeNull()
  })

  it('lists all goals', () => {
    createGoal({ title: 'First' }, db)
    createGoal({ title: 'Second' }, db)
    const goals = getGoals(undefined, db)
    expect(goals.length).toBe(2)
  })

  it('filters by status', () => {
    createGoal({ title: 'Active' }, db)
    const g = createGoal({ title: 'Done' }, db)
    updateGoal(g.id, { status: 'completed' }, db)
    const active = getGoals({ status: 'active' }, db)
    expect(active.length).toBe(1)
    expect(active[0].title).toBe('Active')
  })

  it('filters by ownerAgentId', () => {
    createGoal({ title: 'Owned', ownerAgentId: 'a1' }, db)
    createGoal({ title: 'Unowned' }, db)
    const owned = getGoals({ ownerAgentId: 'a1' }, db)
    expect(owned.length).toBe(1)
    expect(owned[0].title).toBe('Owned')
  })

  it('filters by parentGoalId null (root goals)', () => {
    const parent = createGoal({ title: 'Parent' }, db)
    createGoal({ title: 'Child', parentGoalId: parent.id }, db)
    const roots = getGoals({ parentGoalId: null }, db)
    expect(roots.length).toBe(1)
    expect(roots[0].title).toBe('Parent')
  })

  it('filters by type', () => {
    createGoal({ title: 'Goal', type: 'goal' }, db)
    createGoal({ title: 'OKR', type: 'okr' }, db)
    const okrs = getGoals({ type: 'okr' }, db)
    expect(okrs.length).toBe(1)
    expect(okrs[0].title).toBe('OKR')
  })

  it('updates a goal', () => {
    const g = createGoal({ title: 'Original' }, db)
    const updated = updateGoal(g.id, { title: 'Updated', progress: 50 }, db)
    expect(updated!.title).toBe('Updated')
    expect(updated!.progress).toBe(50)
  })

  it('update with no fields returns existing goal', () => {
    const g = createGoal({ title: 'Same' }, db)
    const same = updateGoal(g.id, {}, db)
    expect(same!.title).toBe('Same')
  })

  it('deletes a goal', () => {
    const g = createGoal({ title: 'ToDelete' }, db)
    expect(deleteGoal(g.id, db)).toBe(true)
    expect(getGoal(g.id, db)).toBeNull()
  })

  it('delete returns false for missing goal', () => {
    expect(deleteGoal('nonexistent', db)).toBe(false)
  })
})

describe('goal hierarchy', () => {
  it('getGoalTree returns full tree from root', () => {
    const root = createGoal({ title: 'Root' }, db)
    const child = createGoal({ title: 'Child', parentGoalId: root.id }, db)
    createGoal({ title: 'Grandchild', parentGoalId: child.id }, db)

    const tree = getGoalTree(root.id, db)
    expect(tree.length).toBe(3)
    expect(tree[0].title).toBe('Root')
  })

  it('getGoalTree with no rootId returns all goals', () => {
    createGoal({ title: 'A' }, db)
    createGoal({ title: 'B' }, db)
    const all = getGoalTree(undefined, db)
    expect(all.length).toBe(2)
  })

  it('getGoalAncestry returns parent chain', () => {
    const grandparent = createGoal({ title: 'Grandparent' }, db)
    const parent = createGoal({ title: 'Parent', parentGoalId: grandparent.id }, db)
    const child = createGoal({ title: 'Child', parentGoalId: parent.id }, db)

    const ancestors = getGoalAncestry(child.id, db)
    expect(ancestors.length).toBe(2)
    expect(ancestors[0].title).toBe('Parent')
    expect(ancestors[1].title).toBe('Grandparent')
  })

  it('getGoalAncestry returns empty for root goal', () => {
    const root = createGoal({ title: 'Root' }, db)
    expect(getGoalAncestry(root.id, db)).toEqual([])
  })
})

describe('goal-project linking', () => {
  it('getGoalAncestryForProject returns goal chain', () => {
    const goal = createGoal({ title: 'Goal' }, db)

    // Create a project linked to the goal
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO projects (id, name, description, status, progress, created_at, updated_at, goal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('proj-1', 'Project', '', 'active', 0, now, now, goal.id)

    const ancestry = getGoalAncestryForProject('proj-1', db)
    expect(ancestry.length).toBe(1)
    expect(ancestry[0].title).toBe('Goal')
  })

  it('getGoalAncestryForProject returns empty for unlinked project', () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO projects (id, name, description, status, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('proj-2', 'Unlinked', '', 'active', 0, now, now)

    expect(getGoalAncestryForProject('proj-2', db)).toEqual([])
  })
})

describe('computeGoalProgress', () => {
  it('returns own progress for leaf goal', () => {
    const g = createGoal({ title: 'Leaf' }, db)
    updateGoal(g.id, { progress: 75 }, db)
    expect(computeGoalProgress(g.id, db)).toBe(75)
  })

  it('averages child goal progress', () => {
    const parent = createGoal({ title: 'Parent' }, db)
    const c1 = createGoal({ title: 'C1', parentGoalId: parent.id }, db)
    const c2 = createGoal({ title: 'C2', parentGoalId: parent.id }, db)
    updateGoal(c1.id, { progress: 60 }, db)
    updateGoal(c2.id, { progress: 40 }, db)

    expect(computeGoalProgress(parent.id, db)).toBe(50)
  })

  it('includes linked project progress', () => {
    const goal = createGoal({ title: 'Goal' }, db)
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO projects (id, name, description, status, progress, created_at, updated_at, goal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('p1', 'Proj', '', 'active', 80, now, now, goal.id)

    expect(computeGoalProgress(goal.id, db)).toBe(80)
  })
})
