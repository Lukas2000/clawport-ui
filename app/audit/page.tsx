'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, RefreshCw, Filter } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { AuditEntry, Agent } from '@/lib/types'

const ACTOR_COLORS: Record<string, string> = {
  operator: 'var(--system-blue)',
  agent: 'var(--system-purple)',
  system: 'var(--text-tertiary)',
}

const ACTION_VERBS: Record<string, string> = {
  'task.created': 'created issue',
  'task.updated': 'updated issue',
  'task.deleted': 'deleted issue',
  'goal.created': 'created goal',
  'goal.updated': 'updated goal',
  'goal.deleted': 'deleted goal',
  'approval.created': 'requested approval',
  'approval.decided': 'decided on approval',
  'agent.created': 'created agent',
  'agent.updated': 'updated agent',
  'agent.deleted': 'deleted agent',
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '--'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

function formatAction(action: string): string {
  return ACTION_VERBS[action] ?? action.replace(/\./g, ' ')
}

type ActorFilter = 'all' | 'operator' | 'agent' | 'system'
type EntityFilter = 'all' | 'task' | 'goal' | 'approval' | 'agent'

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actorFilter, setActorFilter] = useState<ActorFilter>('all')
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')

  const load = useCallback(() => {
    setRefreshing(true)
    const params = new URLSearchParams({ limit: '200' })
    if (actorFilter !== 'all') params.set('actorType', actorFilter)
    if (entityFilter !== 'all') params.set('entityType', entityFilter)

    Promise.all([
      fetch(`/api/audit?${params}`).then(r => r.ok ? r.json() : { entries: [], total: 0 }),
      fetch('/api/agents').then(r => r.ok ? r.json() : []),
    ]).then(([auditData, agentsData]) => {
      setEntries(auditData.entries)
      setTotal(auditData.total)
      setAgents(agentsData)
      setLoading(false)
      setRefreshing(false)
    }).catch(() => { setLoading(false); setRefreshing(false) })
  }, [actorFilter, entityFilter])

  useEffect(() => { load() }, [load])

  function agentName(id: string | null): string {
    if (!id) return 'System'
    return agents.find(a => a.id === id)?.name ?? id
  }

  function agentEmoji(id: string | null): string {
    if (!id) return ''
    return agents.find(a => a.id === id)?.emoji ?? ''
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex-shrink-0"
        style={{
          background: 'var(--header-gradient, var(--material-regular))',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '1px solid var(--separator)',
        }}
      >
        <div className="flex items-center justify-between" style={{ padding: '16px 24px' }}>
          <div>
            <div className="flex items-center" style={{ gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--system-purple) 15%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={16} style={{ color: 'var(--system-purple)' }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.2px',
                  margin: 0,
                }}>
                  Audit Trail
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                  {total} event{total !== 1 ? 's' : ''} recorded
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={load}
            className="focus-ring"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center" style={{ padding: '0 24px 12px', gap: '16px', flexWrap: 'wrap' }}>
          <div className="flex items-center" style={{ gap: '6px' }}>
            <Filter size={12} style={{ color: 'var(--text-quaternary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-quaternary)', fontWeight: 500 }}>Actor:</span>
            {(['all', 'operator', 'agent', 'system'] as ActorFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setLoading(true); setActorFilter(f) }}
                className="focus-ring"
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: actorFilter === f ? 600 : 500,
                  background: actorFilter === f ? 'var(--accent-fill)' : 'var(--fill-secondary)',
                  color: actorFilter === f ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div className="flex items-center" style={{ gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-quaternary)', fontWeight: 500 }}>Entity:</span>
            {(['all', 'task', 'goal', 'approval', 'agent'] as EntityFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setLoading(true); setEntityFilter(f) }}
                className="focus-ring"
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: entityFilter === f ? 600 : 500,
                  background: entityFilter === f ? 'var(--accent-fill)' : 'var(--fill-secondary)',
                  color: entityFilter === f ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {f === 'all' ? 'All' : f + 's'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 24px 24px', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} style={{ height: 48, borderRadius: '8px' }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Shield size={40} style={{ color: 'var(--text-quaternary)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              No audit entries yet
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '320px', margin: '0 auto' }}>
              Actions like creating tasks, goals, and approvals are automatically logged here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Actor indicator */}
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: ACTOR_COLORS[entry.actorType] ?? 'var(--text-tertiary)',
                    flexShrink: 0,
                  }}
                />

                {/* Actor badge */}
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '10px',
                    fontWeight: 600,
                    flexShrink: 0,
                    minWidth: '56px',
                    textAlign: 'center',
                    background: `color-mix(in srgb, ${ACTOR_COLORS[entry.actorType] ?? 'var(--text-tertiary)'} 12%, transparent)`,
                    color: ACTOR_COLORS[entry.actorType] ?? 'var(--text-tertiary)',
                    textTransform: 'capitalize',
                  }}
                >
                  {entry.actorType === 'agent' && entry.agentId
                    ? `${agentEmoji(entry.agentId)} ${agentName(entry.agentId)}`
                    : entry.actorType}
                </span>

                {/* Action description */}
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {formatAction(entry.action)}
                  {entry.entityId && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                      marginLeft: '6px',
                    }}>
                      #{entry.entityId.slice(0, 8)}
                    </span>
                  )}
                  {entry.details && typeof entry.details === 'object' && 'title' in entry.details && (
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                      &mdash; {String(entry.details.title)}
                    </span>
                  )}
                </span>

                {/* Timestamp */}
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-quaternary)',
                  flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {timeAgo(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
