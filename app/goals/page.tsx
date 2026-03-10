'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Goal, Agent } from '@/lib/types'
import { GoalTree } from '@/components/goals/GoalTree'
import { NewGoalDialog } from '@/components/goals/NewGoalDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus, Target } from 'lucide-react'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [goalsRes, agentsRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/agents'),
      ])
      if (goalsRes.ok) setGoals(await goalsRes.json())
      if (agentsRes.ok) setAgents(await agentsRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreate(data: {
    title: string
    description: string
    type: string
    parentGoalId: string | null
    ownerAgentId: string | null
    targetValue: number | null
    targetDate: string | null
  }) {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowCreate(false)
      loadData()
    }
  }

  async function handleUpdate(goalId: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      loadData()
      if (selectedGoal?.id === goalId) {
        setSelectedGoal(await res.json())
      }
    }
  }

  async function handleDelete(goalId: string) {
    const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' })
    if (res.ok) {
      setSelectedGoal(null)
      loadData()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Goals
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            Track objectives and key results across your organization
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--accent)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          New Goal
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
        <div style={{ flex: 1, padding: '16px 24px', overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} style={{ height: 56, borderRadius: '8px' }} />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Create goals and OKRs to track objectives across your organization."
              action={{ label: 'Create Goal', onClick: () => setShowCreate(true) }}
            />
          ) : (
            <GoalTree
              goals={goals}
              agents={agents}
              onSelect={setSelectedGoal}
            />
          )}
        </div>

        {/* Detail sidebar */}
        {selectedGoal && (
          <div
            style={{
              width: '360px',
              borderLeft: '1px solid var(--separator)',
              background: 'var(--bg)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {/* Detail header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--separator)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Goal Details
              </span>
              <button
                onClick={() => setSelectedGoal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: '4px',
                }}
              >
                &times;
              </button>
            </div>

            {/* Detail content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {selectedGoal.title}
              </h2>

              {selectedGoal.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
                  {selectedGoal.description}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--separator)', paddingTop: '12px' }}>
                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', width: '72px' }}>Status</span>
                  <select
                    value={selectedGoal.status}
                    onChange={(e) => handleUpdate(selectedGoal.id, { status: e.target.value })}
                    style={{
                      background: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', width: '72px' }}>Type</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    {selectedGoal.type === 'key-result' ? 'Key Result' : selectedGoal.type}
                  </span>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', width: '72px' }}>Progress</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '3px',
                        background: 'var(--fill-quaternary)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${selectedGoal.progress}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: selectedGoal.progress >= 100 ? '#22C55E' : '#3B82F6',
                          transition: 'width 300ms',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {selectedGoal.progress}%
                    </span>
                  </div>
                </div>

                {/* Owner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', width: '72px' }}>Owner</span>
                  <select
                    value={selectedGoal.ownerAgentId ?? ''}
                    onChange={(e) => handleUpdate(selectedGoal.id, { ownerAgentId: e.target.value || null })}
                    style={{
                      background: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Target date */}
                {selectedGoal.targetDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', width: '72px' }}>Target</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      {new Date(selectedGoal.targetDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Target / Current value */}
                {selectedGoal.targetValue !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', width: '72px' }}>Value</span>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {selectedGoal.currentValue} / {selectedGoal.targetValue}
                    </span>
                  </div>
                )}
              </div>

              {/* Delete button */}
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--separator)' }}>
                <button
                  onClick={() => {
                    if (confirm('Delete this goal?')) handleDelete(selectedGoal.id)
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,69,58,0.3)',
                    background: 'rgba(255,69,58,0.08)',
                    color: 'var(--system-red)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Delete Goal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <NewGoalDialog
          agents={agents}
          goals={goals}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
