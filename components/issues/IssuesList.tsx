'use client'

import type { Task, Agent, IssueLabel } from '@/lib/types'
import { AgentAvatar } from '@/components/AgentAvatar'
import { StatusIcon } from './StatusIcon'
import { PriorityIcon } from './PriorityIcon'

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

interface IssuesListProps {
  tasks: Task[]
  agents: Agent[]
  labels: IssueLabel[]
  taskLabels: Record<string, string[]>
  onSelect: (task: Task) => void
  selectedId?: string | null
}

export function IssuesList({ tasks, agents, labels, taskLabels, onSelect, selectedId }: IssuesListProps) {
  const agentMap = new Map(agents.map(a => [a.id, a]))
  const labelMap = new Map(labels.map(l => [l.id, l]))

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '18px 70px 1fr auto auto auto auto',
          gap: '8px',
          alignItems: 'center',
          padding: '6px 12px',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-quaternary)',
          borderBottom: '1px solid var(--separator)',
        }}
      >
        <span />
        <span>ID</span>
        <span>Title</span>
        <span>Labels</span>
        <span>Assignee</span>
        <span>Priority</span>
        <span>Created</span>
      </div>

      {/* Task rows */}
      {tasks.map(task => {
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
              padding: '8px 12px',
              cursor: 'pointer',
              background: isSelected ? 'var(--accent-fill)' : 'transparent',
              borderBottom: '1px solid var(--separator-light, var(--separator))',
              transition: 'background 80ms',
              minHeight: '40px',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget.style.background = 'var(--fill-quaternary)')
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
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--system-cyan, #32ADE6)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    flexShrink: 0,
                  }}
                />
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

            {/* Created */}
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-quaternary)',
                whiteSpace: 'nowrap',
              }}
              title={new Date(task.createdAt).toLocaleString()}
            >
              {relativeTime(task.createdAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
