'use client'

import { useState } from 'react'
import type { Task, Agent, IssueLabel, TaskStatus, Project } from '@/lib/types'
import { AgentAvatar } from '@/components/AgentAvatar'
import { StatusIcon, STATUS_CONFIG } from './StatusIcon'
import { PriorityIcon } from './PriorityIcon'
import { ChevronDown, ChevronRight } from 'lucide-react'

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export type SortField = 'created' | 'updated' | 'priority' | 'title'
export type SortDir = 'asc' | 'desc'
export type GroupBy = 'status' | 'priority' | 'assignee' | 'project' | 'none'

interface IssuesListProps {
  tasks: Task[]
  agents: Agent[]
  labels: IssueLabel[]
  taskLabels: Record<string, string[]>
  projects?: Project[]
  onSelect: (task: Task) => void
  selectedId?: string | null
  groupBy?: GroupBy
  sortField?: SortField
  sortDir?: SortDir
}

const STATUS_ORDER: TaskStatus[] = ['in-progress', 'review', 'todo', 'backlog', 'done', 'cancelled']

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }

function sortTasks(tasks: Task[], field: SortField, dir: SortDir): Task[] {
  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'created':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updated':
        cmp = new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime()
        break
      case 'priority':
        cmp = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)
        break
      case 'title':
        cmp = a.title.localeCompare(b.title)
        break
    }
    return dir === 'asc' ? cmp : -cmp
  })
  return sorted
}

interface TaskGroup {
  key: string
  label: string
  tasks: Task[]
  color?: string
}

function groupTasks(tasks: Task[], groupBy: GroupBy, agents: Agent[], projects?: Project[]): TaskGroup[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', tasks }]
  }

  if (groupBy === 'status') {
    const groups: TaskGroup[] = []
    for (const status of STATUS_ORDER) {
      const statusTasks = tasks.filter(t => t.status === status)
      if (statusTasks.length > 0) {
        const cfg = STATUS_CONFIG[status]
        groups.push({
          key: status,
          label: cfg?.label ?? status,
          tasks: statusTasks,
          color: cfg?.color,
        })
      }
    }
    return groups
  }

  if (groupBy === 'priority') {
    const order = ['urgent', 'high', 'medium', 'low', 'none']
    const groups: TaskGroup[] = []
    for (const p of order) {
      const pTasks = tasks.filter(t => t.priority === p)
      if (pTasks.length > 0) {
        groups.push({
          key: p,
          label: p.charAt(0).toUpperCase() + p.slice(1),
          tasks: pTasks,
        })
      }
    }
    return groups
  }

  if (groupBy === 'assignee') {
    const agentMap = new Map(agents.map(a => [a.id, a]))
    const assigned = new Map<string, Task[]>()
    const unassigned: Task[] = []
    for (const t of tasks) {
      if (t.assignedAgentId) {
        const list = assigned.get(t.assignedAgentId) ?? []
        list.push(t)
        assigned.set(t.assignedAgentId, list)
      } else {
        unassigned.push(t)
      }
    }
    const groups: TaskGroup[] = []
    for (const [agentId, agentTasks] of assigned) {
      const agent = agentMap.get(agentId)
      groups.push({
        key: agentId,
        label: agent ? `${agent.emoji} ${agent.name}` : agentId,
        tasks: agentTasks,
      })
    }
    if (unassigned.length > 0) {
      groups.push({ key: 'unassigned', label: 'Unassigned', tasks: unassigned })
    }
    return groups
  }

  if (groupBy === 'project') {
    const projectMap = new Map((projects ?? []).map(p => [p.id, p]))
    const grouped = new Map<string, Task[]>()
    const noProject: Task[] = []
    for (const t of tasks) {
      if (t.projectId) {
        const list = grouped.get(t.projectId) ?? []
        list.push(t)
        grouped.set(t.projectId, list)
      } else {
        noProject.push(t)
      }
    }
    const groups: TaskGroup[] = []
    for (const [projectId, projectTasks] of grouped) {
      const project = projectMap.get(projectId)
      groups.push({
        key: projectId,
        label: project?.name ?? projectId,
        tasks: projectTasks,
      })
    }
    if (noProject.length > 0) {
      groups.push({ key: 'no-project', label: 'No project', tasks: noProject })
    }
    return groups
  }

  return [{ key: 'all', label: '', tasks }]
}

export function IssuesList({
  tasks,
  agents,
  labels,
  taskLabels,
  projects,
  onSelect,
  selectedId,
  groupBy = 'status',
  sortField = 'created',
  sortDir = 'desc',
}: IssuesListProps) {
  const agentMap = new Map(agents.map(a => [a.id, a]))
  const labelMap = new Map(labels.map(l => [l.id, l]))
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (tasks.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '32px' }}>📋</span>
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          No issues yet
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          Create your first issue to start tracking work.
        </span>
      </div>
    )
  }

  const sorted = sortTasks(tasks, sortField, sortDir)
  const groups = groupTasks(sorted, groupBy, agents, projects)

  function toggleGroup(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {groups.map(group => (
        <div key={group.key}>
          {/* Group header */}
          {group.label && (
            <button
              onClick={() => toggleGroup(group.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                padding: '6px 12px 6px 16px',
                border: 'none',
                borderBottom: '1px solid var(--separator)',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {collapsed.has(group.key) ? (
                <ChevronRight size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              ) : (
                <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              )}
              {groupBy === 'status' && <StatusIcon status={group.key as TaskStatus} size={12} />}
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: group.color ?? 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {group.label}
              </span>
              <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-quaternary)',
                marginLeft: '2px',
              }}>
                {group.tasks.length}
              </span>
            </button>
          )}

          {/* Task rows */}
          {!collapsed.has(group.key) && group.tasks.map(task => {
            const agent = task.assignedAgentId ? agentMap.get(task.assignedAgentId) ?? null : null
            const taskLabelIds = taskLabels[task.id] ?? []
            const taskLabelList = taskLabelIds.map(id => labelMap.get(id)).filter(Boolean) as IssueLabel[]
            const isSelected = selectedId === task.id
            const isExecuting = task.workState === 'working'

            return (
              <div
                key={task.id}
                onClick={() => onSelect(task)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(task) }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 70px 1fr auto auto auto auto',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-fill)' : 'transparent',
                  borderBottom: '1px solid var(--separator)',
                  transition: 'background 80ms',
                  minHeight: '34px',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget.style.background = 'transparent')
                }}
              >
                {/* Status */}
                <StatusIcon status={task.status} size={14} />

                {/* Identifier */}
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                    color: 'var(--text-tertiary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.identifier ?? '—'}
                </span>

                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.title}
                  </span>
                  {isExecuting && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--system-cyan, #32ADE6)',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                      />
                      <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--system-cyan, #32ADE6)' }}>Live</span>
                    </span>
                  )}
                  {task.checkoutAgentId && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: 'var(--system-orange)',
                        background: 'color-mix(in srgb, var(--system-orange) 10%, transparent)',
                        borderRadius: '3px',
                        padding: '0 3px',
                        flexShrink: 0,
                      }}
                    >
                      🔒
                    </span>
                  )}
                </div>

                {/* Labels */}
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                  {taskLabelList.slice(0, 2).map(l => (
                    <span
                      key={l.id}
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '0 5px',
                        borderRadius: '3px',
                        background: `color-mix(in srgb, ${l.color} 15%, transparent)`,
                        color: l.color,
                        lineHeight: '16px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.name}
                    </span>
                  ))}
                  {taskLabelList.length > 2 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-quaternary)' }}>
                      +{taskLabelList.length - 2}
                    </span>
                  )}
                </div>

                {/* Assignee */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {agent ? (
                    <>
                      <AgentAvatar agent={agent} size={18} borderRadius={5} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {agent.name}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>—</span>
                  )}
                </div>

                {/* Priority */}
                <PriorityIcon priority={task.priority} size={14} />

                {/* Date */}
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-quaternary)',
                    whiteSpace: 'nowrap',
                  }}
                  title={new Date(task.createdAt).toLocaleString()}
                >
                  {formatDate(task.createdAt)}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
