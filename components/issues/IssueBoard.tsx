'use client'

import type { Task, Agent, IssueLabel, TaskStatus } from '@/lib/types'
import { IssueCard } from './IssueCard'
import { StatusIcon, STATUS_CONFIG } from './StatusIcon'
import { Plus } from 'lucide-react'

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'Todo' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

interface IssueBoardProps {
  tasks: Task[]
  agents: Agent[]
  labels: IssueLabel[]
  taskLabels: Record<string, string[]>
  onSelect: (task: Task) => void
  onMove: (taskId: string, status: TaskStatus) => void
  onCreate: () => void
  subIssueCounts?: Record<string, number>
}

function BoardColumn({
  column,
  tasks,
  agents,
  labels,
  taskLabels,
  onSelect,
  onDrop,
  onCreate,
  subIssueCounts,
}: {
  column: { id: TaskStatus; label: string }
  tasks: Task[]
  agents: Agent[]
  labels: IssueLabel[]
  taskLabels: Record<string, string[]>
  onSelect: (task: Task) => void
  onDrop: (taskId: string, status: TaskStatus) => void
  onCreate?: () => void
  subIssueCounts?: Record<string, number>
}) {
  const agentMap = new Map(agents.map(a => [a.id, a]))
  const labelMap = new Map(labels.map(l => [l.id, l]))

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) onDrop(taskId, column.id)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: '1 0 240px',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 8px 12px',
          flexShrink: 0,
        }}
      >
        <StatusIcon status={column.id} size={14} />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          {column.label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-quaternary)',
            background: 'var(--fill-quaternary)',
            borderRadius: '4px',
            padding: '0 5px',
            lineHeight: '18px',
          }}
        >
          {tasks.length}
        </span>
        {onCreate && (
          <button
            onClick={onCreate}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '0 4px 8px',
        }}
      >
        {tasks.map(task => {
          const agent = task.assignedAgentId ? agentMap.get(task.assignedAgentId) ?? null : null
          const taskLabelIds = taskLabels[task.id] ?? []
          const cardLabels = taskLabelIds.map(id => labelMap.get(id)).filter(Boolean) as IssueLabel[]

          return (
            <IssueCard
              key={task.id}
              task={task}
              agent={agent}
              labels={cardLabels}
              subIssueCount={subIssueCounts?.[task.id]}
              onClick={() => onSelect(task)}
              isExecuting={task.workState === 'working'}
            />
          )
        })}
      </div>
    </div>
  )
}

export function IssueBoard({
  tasks,
  agents,
  labels,
  taskLabels,
  onSelect,
  onMove,
  onCreate,
  subIssueCounts,
}: IssueBoardProps) {
  // Group tasks by status
  const byStatus = new Map<TaskStatus, Task[]>()
  for (const col of COLUMNS) byStatus.set(col.id, [])
  for (const task of tasks) {
    const list = byStatus.get(task.status as TaskStatus)
    if (list) list.push(task)
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        height: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '0 4px',
      }}
    >
      {COLUMNS.map(column => (
        <BoardColumn
          key={column.id}
          column={column}
          tasks={byStatus.get(column.id) ?? []}
          agents={agents}
          labels={labels}
          taskLabels={taskLabels}
          onSelect={onSelect}
          onDrop={onMove}
          onCreate={column.id === 'backlog' ? onCreate : undefined}
          subIssueCounts={subIssueCounts}
        />
      ))}
    </div>
  )
}
