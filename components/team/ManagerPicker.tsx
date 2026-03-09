'use client'

import type { Agent } from '@/lib/types'

interface ManagerPickerProps {
  agents: Agent[]
  value: string | null
  onChange: (agentId: string | null) => void
  excludeId?: string // exclude this agent (can't be own manager)
}

export function ManagerPicker({ agents, value, onChange, excludeId }: ManagerPickerProps) {
  const options = agents.filter((a) => a.id !== excludeId)

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid var(--separator)',
        background: 'var(--fill-tertiary)',
        color: 'var(--text-primary)',
        fontSize: 14,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
      }}
    >
      <option value="">No manager (root agent)</option>
      {options.map((a) => (
        <option key={a.id} value={a.id}>
          {a.emoji} {a.name} — {a.title}
        </option>
      ))}
    </select>
  )
}
