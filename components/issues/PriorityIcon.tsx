'use client'

import type { TaskPriority } from '@/lib/types'

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string; bars: number }> = {
  'urgent': { color: 'var(--system-red)', label: 'Urgent', bars: 3 },
  'high': { color: 'var(--system-orange)', label: 'High', bars: 3 },
  'medium': { color: 'var(--system-blue)', label: 'Medium', bars: 2 },
  'low': { color: 'var(--text-tertiary)', label: 'Low', bars: 1 },
  'none': { color: 'var(--text-quaternary)', label: 'No priority', bars: 0 },
}

interface PriorityIconProps {
  priority: TaskPriority
  size?: number
}

export function PriorityIcon({ priority, size = 14 }: PriorityIconProps) {
  const config = PRIORITY_CONFIG[priority]
  const barWidth = size * 0.16
  const gap = size * 0.1
  const totalWidth = barWidth * 3 + gap * 2
  const offsetX = (size - totalWidth) / 2

  if (priority === 'urgent') {
    // Filled bars with exclamation-like urgency
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={config.label} style={{ flexShrink: 0 }}>
        {[0, 1, 2].map(i => (
          <rect
            key={i}
            x={offsetX + i * (barWidth + gap)}
            y={size * 0.2}
            width={barWidth}
            height={size * 0.6}
            rx={barWidth * 0.3}
            fill={config.color}
          />
        ))}
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={config.label} style={{ flexShrink: 0 }}>
      {[0, 1, 2].map(i => {
        const barHeight = size * (0.25 + i * 0.17)
        const y = size * 0.85 - barHeight
        const filled = i < config.bars
        return (
          <rect
            key={i}
            x={offsetX + i * (barWidth + gap)}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={barWidth * 0.3}
            fill={filled ? config.color : 'var(--fill-tertiary)'}
          />
        )
      })}
    </svg>
  )
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: 'var(--text-caption2)',
        fontWeight: 500,
        color: config.color,
      }}
    >
      <PriorityIcon priority={priority} size={12} />
      {config.label}
    </span>
  )
}

export { PRIORITY_CONFIG }
