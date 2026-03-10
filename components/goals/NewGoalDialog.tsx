'use client'

import { useState } from 'react'
import type { Agent, Goal, GoalType } from '@/lib/types'
import { X } from 'lucide-react'

interface NewGoalDialogProps {
  agents: Agent[]
  goals: Goal[]
  onSubmit: (data: {
    title: string
    description: string
    type: GoalType
    parentGoalId: string | null
    ownerAgentId: string | null
    targetValue: number | null
    targetDate: string | null
  }) => void
  onClose: () => void
}

export function NewGoalDialog({ agents, goals, onSubmit, onClose }: NewGoalDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<GoalType>('goal')
  const [parentGoalId, setParentGoalId] = useState<string | null>(null)
  const [ownerAgentId, setOwnerAgentId] = useState<string | null>(null)
  const [targetValue, setTargetValue] = useState('')
  const [targetDate, setTargetDate] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      parentGoalId,
      ownerAgentId,
      targetValue: targetValue ? Number(targetValue) : null,
      targetDate: targetDate || null,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--material-thick)',
          borderRadius: '12px',
          border: '1px solid var(--separator)',
          width: '480px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--separator)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            New Goal
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Title */}
          <input
            type="text"
            placeholder="Goal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--separator)',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--separator)',
              background: 'transparent',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />

          {/* Properties grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as GoalType)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="goal">Goal</option>
                <option value="okr">OKR</option>
                <option value="key-result">Key Result</option>
              </select>
            </div>

            {/* Owner */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Owner</label>
              <select
                value={ownerAgentId ?? ''}
                onChange={(e) => setOwnerAgentId(e.target.value || null)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">No owner</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                ))}
              </select>
            </div>

            {/* Parent Goal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Parent Goal</label>
              <select
                value={parentGoalId ?? ''}
                onChange={(e) => setParentGoalId(e.target.value || null)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">None (root goal)</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>

            {/* Target Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Target Value */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Target Value (optional)</label>
            <input
              type="number"
              placeholder="e.g. 100"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--separator)',
                background: 'transparent',
                fontSize: '12px',
                color: 'var(--text-primary)',
                outline: 'none',
                maxWidth: '200px',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '12px 20px 16px',
            borderTop: '1px solid var(--separator)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--separator)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: title.trim() ? 'var(--accent)' : 'var(--fill-tertiary)',
              color: title.trim() ? 'white' : 'var(--text-quaternary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: title.trim() ? 'pointer' : 'default',
            }}
          >
            Create Goal
          </button>
        </div>
      </form>
    </div>
  )
}
