'use client'

import type { TaskStatus } from '@/lib/types'

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string }> = {
  'backlog': { color: 'var(--text-quaternary)', label: 'Backlog' },
  'todo': { color: 'var(--system-blue)', label: 'Todo' },
  'in-progress': { color: 'var(--system-orange)', label: 'In Progress' },
  'review': { color: 'var(--system-purple)', label: 'Review' },
  'done': { color: 'var(--system-green)', label: 'Done' },
  'cancelled': { color: 'var(--text-quaternary)', label: 'Cancelled' },
}

interface StatusIconProps {
  status: TaskStatus
  size?: number
}

export function StatusIcon({ status, size = 14 }: StatusIconProps) {
  const config = STATUS_CONFIG[status]
  const r = size / 2
  const strokeWidth = size > 12 ? 1.5 : 1

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-label={config.label}
      style={{ flexShrink: 0 }}
    >
      {status === 'backlog' && (
        /* Dashed circle */
        <circle
          cx={r}
          cy={r}
          r={r - strokeWidth}
          stroke={config.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${size * 0.2} ${size * 0.15}`}
          fill="none"
        />
      )}
      {status === 'todo' && (
        /* Empty circle */
        <circle
          cx={r}
          cy={r}
          r={r - strokeWidth}
          stroke={config.color}
          strokeWidth={strokeWidth}
          fill="none"
        />
      )}
      {status === 'in-progress' && (
        /* Half-filled circle */
        <>
          <circle
            cx={r}
            cy={r}
            r={r - strokeWidth}
            stroke={config.color}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <path
            d={`M ${r} ${strokeWidth} A ${r - strokeWidth} ${r - strokeWidth} 0 0 1 ${r} ${size - strokeWidth}`}
            fill={config.color}
          />
        </>
      )}
      {status === 'review' && (
        /* Circle with inner dot */
        <>
          <circle
            cx={r}
            cy={r}
            r={r - strokeWidth}
            stroke={config.color}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle cx={r} cy={r} r={size * 0.2} fill={config.color} />
        </>
      )}
      {status === 'done' && (
        /* Filled circle with checkmark */
        <>
          <circle cx={r} cy={r} r={r - 0.5} fill={config.color} />
          <path
            d={`M ${size * 0.28} ${r} L ${size * 0.43} ${size * 0.62} L ${size * 0.72} ${size * 0.35}`}
            stroke="white"
            strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
      {status === 'cancelled' && (
        /* Circle with X */
        <>
          <circle
            cx={r}
            cy={r}
            r={r - strokeWidth}
            stroke={config.color}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <line
            x1={size * 0.32}
            y1={size * 0.32}
            x2={size * 0.68}
            y2={size * 0.68}
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <line
            x1={size * 0.68}
            y1={size * 0.32}
            x2={size * 0.32}
            y2={size * 0.68}
            stroke={config.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: 'var(--text-caption2)',
        fontWeight: 500,
        color: config.color,
      }}
    >
      <StatusIcon status={status} size={12} />
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
