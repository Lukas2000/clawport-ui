'use client'

import type { AgentRuntimeStatus } from '@/lib/types'

const STATUS_CONFIG: Record<AgentRuntimeStatus, { color: string; label: string; pulse?: boolean }> = {
  idle: { color: '#22C55E', label: 'Idle' },
  active: { color: '#22C55E', label: 'Active' },
  working: { color: '#06B6D4', label: 'Working', pulse: true },
  paused: { color: '#F59E0B', label: 'Paused' },
  errored: { color: '#EF4444', label: 'Error' },
  offline: { color: '#6B7280', label: 'Offline' },
}

interface AgentStatusBadgeProps {
  status: AgentRuntimeStatus
  size?: number
  showLabel?: boolean
}

export function AgentStatusBadge({ status, size = 8, showLabel = false }: AgentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: config.color,
          flexShrink: 0,
          display: 'inline-block',
          animation: config.pulse ? 'pulse-cyan 1.5s ease-in-out infinite' : undefined,
        }}
      />
      {showLabel && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: config.color,
          }}
        >
          {config.label}
        </span>
      )}
    </span>
  )
}
