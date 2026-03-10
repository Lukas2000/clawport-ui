'use client'

import type { Goal, Agent } from '@/lib/types'
import { Target, ChevronRight } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: '#3B82F6',
  completed: '#22C55E',
  paused: '#F59E0B',
  cancelled: '#6B7280',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
}

interface GoalCardProps {
  goal: Goal
  agents: Agent[]
  childCount: number
  depth: number
  expanded: boolean
  onToggle: () => void
  onClick: () => void
}

export function GoalCard({ goal, agents, childCount, depth, expanded, onToggle, onClick }: GoalCardProps) {
  const owner = goal.ownerAgentId ? agents.find(a => a.id === goal.ownerAgentId) : null
  const statusColor = STATUS_COLORS[goal.status] ?? '#6B7280'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        marginLeft: depth * 24,
        borderRadius: '8px',
        border: '1px solid var(--separator)',
        background: 'var(--material)',
        cursor: 'pointer',
        transition: 'background 100ms',
      }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--fill-quaternary)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--material)')}
    >
      {/* Expand toggle */}
      {childCount > 0 ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            display: 'flex',
            transition: 'transform 150ms',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronRight size={14} />
        </button>
      ) : (
        <span style={{ width: '18px' }} />
      )}

      {/* Icon */}
      <Target size={14} style={{ color: statusColor, flexShrink: 0 }} />

      {/* Title + type badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {goal.title}
          </span>
          {goal.type !== 'goal' && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'var(--fill-quaternary)',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {goal.type === 'okr' ? 'OKR' : 'KR'}
            </span>
          )}
        </div>
        {goal.description && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              marginTop: '2px',
            }}
          >
            {goal.description}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '60px',
          height: '6px',
          borderRadius: '3px',
          background: 'var(--fill-quaternary)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${goal.progress}%`,
            height: '100%',
            borderRadius: '3px',
            background: goal.progress >= 100 ? '#22C55E' : statusColor,
            transition: 'width 300ms',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)',
          width: '32px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {goal.progress}%
      </span>

      {/* Status badge */}
      <span
        style={{
          fontSize: '10px',
          fontWeight: 500,
          padding: '2px 6px',
          borderRadius: '4px',
          background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
          color: statusColor,
          flexShrink: 0,
        }}
      >
        {STATUS_LABELS[goal.status]}
      </span>

      {/* Owner */}
      {owner && (
        <span
          style={{
            fontSize: '14px',
            flexShrink: 0,
          }}
          title={owner.name}
        >
          {owner.emoji}
        </span>
      )}

      {/* Child count */}
      {childCount > 0 && (
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-quaternary)',
            background: 'var(--fill-quaternary)',
            borderRadius: '3px',
            padding: '0 4px',
            lineHeight: '16px',
            flexShrink: 0,
          }}
        >
          {childCount}
        </span>
      )}
    </div>
  )
}
