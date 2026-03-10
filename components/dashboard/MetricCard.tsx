'use client'

import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtext?: string
  color?: string
}

export function MetricCard({ icon: Icon, label, value, subtext, color = 'var(--accent)' }: MetricCardProps) {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: '160px',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--separator)',
        background: 'var(--material)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {subtext && (
          <span style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  )
}
