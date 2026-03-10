'use client'

import { useState, useEffect, useCallback } from 'react'
import type { HeartbeatConfig, HeartbeatRun } from '@/lib/types'
import { Play, Pause, RefreshCw, AlertCircle } from 'lucide-react'

interface HeartbeatPanelProps {
  agentId: string
}

function relativeTime(ts: string | null): string {
  if (!ts) return 'Never'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const RUN_STATUS_COLORS: Record<string, string> = {
  queued: '#6B7280',
  running: '#06B6D4',
  succeeded: '#22C55E',
  failed: '#EF4444',
  cancelled: '#9CA3AF',
  timed_out: '#F59E0B',
}

export function HeartbeatPanel({ agentId }: HeartbeatPanelProps) {
  const [config, setConfig] = useState<HeartbeatConfig | null>(null)
  const [runs, setRuns] = useState<HeartbeatRun[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [configRes, runsRes] = await Promise.all([
        fetch(`/api/heartbeat/${agentId}`),
        fetch(`/api/heartbeat/${agentId}/runs?limit=10`),
      ])
      if (configRes.ok) setConfig(await configRes.json())
      else setConfig(null)
      if (runsRes.ok) setRuns(await runsRes.json())
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { loadData() }, [loadData])

  async function handleToggle() {
    const res = await fetch(`/api/heartbeat/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: !config?.enabled,
        intervalMinutes: config?.intervalMinutes ?? 60,
      }),
    })
    if (res.ok) loadData()
  }

  async function handleManualTrigger() {
    await fetch(`/api/heartbeat/${agentId}`, { method: 'POST' })
    loadData()
  }

  async function handleIntervalChange(minutes: number) {
    await fetch(`/api/heartbeat/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: config?.enabled ?? false,
        intervalMinutes: minutes,
      }),
    })
    loadData()
  }

  if (loading) {
    return <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-quaternary)' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--separator)',
            background: config?.enabled ? 'color-mix(in srgb, #22C55E 12%, transparent)' : 'transparent',
            color: config?.enabled ? '#22C55E' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {config?.enabled ? <Pause size={12} /> : <Play size={12} />}
          {config?.enabled ? 'Enabled' : 'Disabled'}
        </button>

        <button
          onClick={handleManualTrigger}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--separator)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} />
          Trigger
        </button>

        <select
          value={config?.intervalMinutes ?? 60}
          onChange={(e) => handleIntervalChange(Number(e.target.value))}
          style={{
            marginLeft: 'auto',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--separator)',
            background: 'transparent',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value={5}>Every 5 min</option>
          <option value={15}>Every 15 min</option>
          <option value={30}>Every 30 min</option>
          <option value={60}>Every hour</option>
          <option value={360}>Every 6 hours</option>
          <option value={1440}>Daily</option>
        </select>
      </div>

      {/* Status info */}
      {config && (
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          <span>Last beat: {relativeTime(config.lastBeatAt)}</span>
          {config.consecutiveErrors > 0 && (
            <span style={{ color: 'var(--system-red)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertCircle size={10} />
              {config.consecutiveErrors} consecutive errors
            </span>
          )}
        </div>
      )}

      {config?.lastError && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '6px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '11px',
            color: 'var(--system-red)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {config.lastError}
        </div>
      )}

      {/* Run history */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Runs
        </div>
        {runs.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-quaternary)', padding: '8px 0' }}>
            No runs yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {runs.map(run => (
              <div
                key={run.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--separator)',
                  fontSize: '11px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: RUN_STATUS_COLORS[run.status] ?? '#6B7280',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                  {run.trigger}
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {run.tasksExecuted}/{run.tasksChecked}
                </span>
                <span style={{ color: 'var(--text-quaternary)' }}>
                  {relativeTime(run.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
