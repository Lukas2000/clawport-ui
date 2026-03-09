'use client'

import type { Agent } from '@/lib/types'

interface DeleteConfirmModalProps {
  agent: Agent
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ agent, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--material-thick)',
          borderRadius: 'var(--radius-xl)',
          padding: 24,
          maxWidth: 420,
          width: '90%',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Delete {agent.name}?
        </h3>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
          This will permanently remove <strong>{agent.name}</strong> and delete their agent directory from the workspace.
        </p>

        {agent.directReports.length > 0 && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(255,69,58,0.08)',
              border: '1px solid rgba(255,69,58,0.2)',
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--system-red)',
              lineHeight: 1.5,
            }}
          >
            This agent has {agent.directReports.length} direct report{agent.directReports.length !== 1 ? 's' : ''}.
            They will be reassigned to {agent.reportsTo ? 'this agent\'s manager' : 'no manager'}.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--separator)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--system-red)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete Agent
          </button>
        </div>
      </div>
    </div>
  )
}
