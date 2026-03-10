'use client'

import { useState, useMemo } from 'react'
import type { Goal, Agent } from '@/lib/types'
import { GoalCard } from './GoalCard'

interface GoalTreeProps {
  goals: Goal[]
  agents: Agent[]
  onSelect: (goal: Goal) => void
}

interface TreeNode {
  goal: Goal
  children: TreeNode[]
}

function buildTree(goals: Goal[]): TreeNode[] {
  const byId = new Map(goals.map(g => [g.id, g]))
  const childrenMap = new Map<string | null, Goal[]>()

  for (const g of goals) {
    const parentKey = g.parentGoalId ?? null
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, [])
    childrenMap.get(parentKey)!.push(g)
  }

  function build(parentId: string | null): TreeNode[] {
    const children = childrenMap.get(parentId) ?? []
    return children.map(g => ({
      goal: g,
      children: build(g.id),
    }))
  }

  return build(null)
}

function countDescendants(node: TreeNode): number {
  let count = node.children.length
  for (const child of node.children) {
    count += countDescendants(child)
  }
  return count
}

function TreeNodeRow({
  node,
  agents,
  depth,
  expanded,
  onToggle,
  onSelect,
  expandedIds,
  onToggleId,
}: {
  node: TreeNode
  agents: Agent[]
  depth: number
  expanded: boolean
  onToggle: () => void
  onSelect: (goal: Goal) => void
  expandedIds: Set<string>
  onToggleId: (id: string) => void
}) {
  return (
    <>
      <GoalCard
        goal={node.goal}
        agents={agents}
        childCount={node.children.length}
        depth={depth}
        expanded={expanded}
        onToggle={onToggle}
        onClick={() => onSelect(node.goal)}
      />
      {expanded && node.children.map(child => (
        <TreeNodeRow
          key={child.goal.id}
          node={child}
          agents={agents}
          depth={depth + 1}
          expanded={expandedIds.has(child.goal.id)}
          onToggle={() => onToggleId(child.goal.id)}
          onSelect={onSelect}
          expandedIds={expandedIds}
          onToggleId={onToggleId}
        />
      ))}
    </>
  )
}

export function GoalTree({ goals, agents, onSelect }: GoalTreeProps) {
  const tree = useMemo(() => buildTree(goals), [goals])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand root nodes
    return new Set(tree.map(n => n.goal.id))
  })

  function toggleId(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (goals.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          color: 'var(--text-quaternary)',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '32px' }}>🎯</span>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>No goals yet</span>
        <span style={{ fontSize: '12px' }}>Create your first goal to start tracking progress</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {tree.map(node => (
        <TreeNodeRow
          key={node.goal.id}
          node={node}
          agents={agents}
          depth={0}
          expanded={expandedIds.has(node.goal.id)}
          onToggle={() => toggleId(node.goal.id)}
          onSelect={onSelect}
          expandedIds={expandedIds}
          onToggleId={toggleId}
        />
      ))}
    </div>
  )
}
