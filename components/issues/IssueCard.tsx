'use client'

import { useState } from 'react'
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

interface IssueCardProps {
  task: Task
  agent: Agent | null
  labels?: IssueLabel[]
  subIssueCount?: number
  onClick: () => void
  isExecuting?: boolean
}

export function IssueCard({ task, agent, labels, subIssueCount, onClick, isExecuting }: IssueCardProps) {
  const [isDragging, setIsDragging] = useState(false)

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="hover-lift focus-ring"
      style={{
        background: 'var(--material-regular)',
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid var(--separator)',
        borderLeft: agent ? `3px solid ${agent.color}` : '1px solid var(--separator)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        userSelect: 'none',
        transition: 'opacity 150ms, box-shadow 150ms',
        position: 'relative',
      }}
    >
      {/* Top row: identifier + priority */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <StatusIcon status={task.status} size={14} />
          {task.identifier && (
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
              }}
            >
              {task.identifier}
            </span>
          )}
        </div>
        <PriorityIcon priority={task.priority} size={14} />
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {task.title}
      </div>

      {/* Description preview */}
      {task.description && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </div>
      )}

      {/* Labels */}
      {labels && labels.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {labels.map(l => (
            <span
              key={l.id}
              style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: '4px',
                background: `color-mix(in srgb, ${l.color} 15%, transparent)`,
                color: l.color,
                lineHeight: '16px',
              }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: agent avatar, sub-issues, timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {agent && <AgentAvatar agent={agent} size={20} borderRadius={6} />}

        {(subIssueCount ?? 0) > 0 && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: 'var(--fill-quaternary)',
              padding: '1px 5px',
              borderRadius: '4px',
            }}
          >
            {subIssueCount} sub
          </span>
        )}

        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-quaternary)',
            marginLeft: 'auto',
          }}
          title={new Date(task.createdAt).toLocaleString()}
        >
          {relativeTime(task.createdAt)}
        </span>
      </div>

      {/* Execution indicator */}
      {(task.workState === 'working' || isExecuting) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--system-cyan, #32ADE6)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--system-cyan, #32ADE6)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          Executing...
        </div>
      )}

      {task.workState === 'failed' && (
        <div
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--system-red)',
            background: 'color-mix(in srgb, var(--system-red) 10%, transparent)',
            borderRadius: '4px',
            padding: '2px 6px',
          }}
        >
          Failed
        </div>
      )}

      {/* Checkout indicator */}
      {task.checkoutAgentId && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            fontSize: '9px',
            fontWeight: 600,
            color: 'var(--system-orange)',
            background: 'color-mix(in srgb, var(--system-orange) 10%, transparent)',
            borderRadius: '3px',
            padding: '1px 4px',
          }}
        >
          Locked
        </div>
      )}
    </div>
  )
}
