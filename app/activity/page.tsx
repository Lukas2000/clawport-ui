'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LogEntry, LogFilter, LogSummary, AuditEntry } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Radio, FileText, Shield } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState'
import { LogBrowser } from '@/components/activity/LogBrowser'

/* ── Time helpers ──────────────────────────────────────────────── */

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

/* ── Summary Cards ─────────────────────────────────────────────── */

function TotalCard({ count }: { count: number }) {
  return (
    <div style={{
      background: 'var(--surface-gradient, transparent), var(--material-regular)',
      border: '1px solid var(--separator)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      transition: 'box-shadow 300ms var(--ease-smooth), transform 300ms var(--ease-spring)',
    }}>
      <div style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-tertiary)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-1)' }}>
        Total Events
      </div>
      <div style={{ fontSize: 'var(--text-title2)', color: 'var(--text-primary)', fontWeight: 'var(--weight-bold)' }}>
        {count}
      </div>
    </div>
  )
}

function ErrorCard({ count }: { count: number }) {
  const hasErrors = count > 0
  return (
    <div style={{
      background: 'var(--surface-gradient, transparent), var(--material-regular)',
      border: '1px solid var(--separator)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      transition: 'box-shadow 300ms var(--ease-smooth), transform 300ms var(--ease-spring)',
    }}>
      <div style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-tertiary)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-1)' }}>
        Errors
      </div>
      <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
        {hasErrors && (
          <span className="animate-error-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--system-red)', flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: 'var(--text-title2)',
          fontWeight: 'var(--weight-bold)',
          color: hasErrors ? 'var(--system-red)' : 'var(--system-green)',
        }}>
          {count}
        </span>
      </div>
    </div>
  )
}

function SourcesCard({ cron, config }: { cron: number; config: number }) {
  return (
    <div style={{
      background: 'var(--surface-gradient, transparent), var(--material-regular)',
      border: '1px solid var(--separator)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      transition: 'box-shadow 300ms var(--ease-smooth), transform 300ms var(--ease-spring)',
    }}>
      <div style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-tertiary)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-1)' }}>
        Sources
      </div>
      <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
        <div>
          <span style={{ fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--system-blue)' }}>{cron}</span>
          <span style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-tertiary)', marginLeft: 4 }}>cron</span>
        </div>
        <div>
          <span style={{ fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--system-purple)' }}>{config}</span>
          <span style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-tertiary)', marginLeft: 4 }}>config</span>
        </div>
      </div>
    </div>
  )
}

/* ── Audit Browser ────────────────────────────────────────────── */

const ACTOR_COLORS: Record<string, string> = {
  operator: 'var(--system-blue)',
  agent: 'var(--system-purple)',
  system: 'var(--text-tertiary)',
}

function AuditBrowser() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actorFilter, setActorFilter] = useState<string>('all')

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' })
    if (actorFilter !== 'all') params.set('actorType', actorFilter)

    fetch(`/api/audit?${params}`)
      .then(r => r.ok ? r.json() : { entries: [], total: 0 })
      .then((data: { entries: AuditEntry[]; total: number }) => {
        setEntries(data.entries)
        setTotal(data.total)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [actorFilter])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} style={{ height: 40, borderRadius: 'var(--radius-sm)' }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Filter pills */}
      <div className="flex items-center" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        {['all', 'operator', 'agent', 'system'].map(f => (
          <button
            key={f}
            onClick={() => { setLoading(true); setActorFilter(f) }}
            className="focus-ring"
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-caption1)',
              fontWeight: 500,
              background: actorFilter === f ? 'var(--accent-fill)' : 'var(--fill-secondary)',
              color: actorFilter === f ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {f === 'all' ? `All (${total})` : f}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)' }}>
          No audit entries yet. Actions like creating tasks, goals, and approvals are automatically logged.
        </div>
      ) : (
        <div style={{
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: 'var(--material-regular)',
        }}>
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderTop: idx > 0 ? '1px solid var(--separator)' : undefined,
                fontSize: 'var(--text-caption1)',
              }}
            >
              {/* Timestamp */}
              <span style={{ color: 'var(--text-quaternary)', minWidth: 60, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption2)' }}>
                {timeAgo(entry.timestamp)}
              </span>

              {/* Actor badge */}
              <span style={{
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 'var(--text-caption2)',
                fontWeight: 600,
                flexShrink: 0,
                background: `color-mix(in srgb, ${ACTOR_COLORS[entry.actorType] ?? 'var(--text-tertiary)'} 12%, transparent)`,
                color: ACTOR_COLORS[entry.actorType] ?? 'var(--text-tertiary)',
              }}>
                {entry.actorType}
              </span>

              {/* Action */}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                color: 'var(--text-primary)',
                flexShrink: 0,
              }}>
                {entry.action}
              </span>

              {/* Entity */}
              <span style={{ color: 'var(--text-tertiary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.entityType}
                {entry.entityId && <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 4 }}>#{entry.entityId.slice(0, 8)}</span>}
              </span>

              {/* Details preview */}
              {Object.keys(entry.details).length > 0 && (
                <span style={{ color: 'var(--text-quaternary)', fontSize: 'var(--text-caption2)', flexShrink: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type ActivityTab = 'logs' | 'audit'

/* ── Page ──────────────────────────────────────────────────────── */

export default function ActivityPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState<LogSummary | null>(null)
  const [filter, setFilter] = useState<LogFilter>('all')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAgo, setUpdatedAgo] = useState('just now')
  const [activeTab, setActiveTab] = useState<ActivityTab>('logs')

  const refresh = useCallback(() => {
    setRefreshing(true)
    setError(null)
    fetch('/api/logs')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load logs')
        return r.json()
      })
      .then((data: { entries: LogEntry[]; summary: LogSummary }) => {
        setEntries(data.entries)
        setSummary(data.summary)
        setLastRefresh(new Date())
        setLoading(false)
        setRefreshing(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  // Initial load + polling
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60000)
    return () => clearInterval(interval)
  }, [refresh])

  // Updated ago ticker
  useEffect(() => {
    const tick = () => setUpdatedAgo(timeAgo(lastRefresh.toISOString()))
    tick()
    const interval = setInterval(tick, 30000)
    return () => clearInterval(interval)
  }, [lastRefresh])

  if (error && entries.length === 0) {
    return <ErrorState message={error} onRetry={refresh} />
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in" style={{ background: 'var(--bg)' }}>
      {/* ── Sticky header ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 flex-shrink-0"
        style={{
          background: 'var(--header-gradient, var(--material-regular))',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '1px solid var(--separator)',
        }}
      >
        <div className="flex items-center justify-between" style={{ padding: 'var(--space-4) var(--space-6)' }}>
          <div>
            <h1 className="page-title" style={{
              fontSize: 'var(--text-title1)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
              lineHeight: 'var(--leading-tight)',
            }}>
              Activity Console
            </h1>
            {!loading && summary && (
              <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                {summary.totalEntries} event{summary.totalEntries !== 1 ? 's' : ''}
                {summary.errorCount > 0 && (
                  <span style={{ color: 'var(--system-red)' }}>
                    {' \u00b7 '}{summary.errorCount} error{summary.errorCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
            {/* Open Live Stream */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('clawport:open-stream-widget'))}
              className="focus-ring flex items-center"
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-footnote)',
                fontWeight: 'var(--weight-semibold)',
                gap: 6,
                background: 'var(--accent-fill)',
                color: 'var(--accent)',
                transition: 'all 200ms var(--ease-smooth)',
              }}
            >
              <Radio size={14} />
              Open Live Stream
            </button>

            <span style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-tertiary)' }}>
              Updated {updatedAgo}
            </span>
            <button
              onClick={refresh}
              className="focus-ring"
              aria-label="Refresh activity data"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'color 150ms var(--ease-smooth)',
              }}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center" style={{ padding: '0 var(--space-6) var(--space-3)', gap: 'var(--space-1)' }}>
          {([
            { key: 'logs' as const, label: 'Logs', icon: FileText },
            { key: 'audit' as const, label: 'Audit Trail', icon: Shield },
          ]).map(t => {
            const isActive = activeTab === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="focus-ring"
                style={{
                  padding: '6px 16px',
                  fontSize: 'var(--text-footnote)',
                  fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 200ms var(--ease-smooth)',
                  background: isActive ? 'var(--accent-fill)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Scrollable content ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col" style={{ padding: 'var(--space-4) var(--space-6) var(--space-6)', minHeight: 0 }}>
        {loading ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }} className="summary-cards-grid">
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: 'var(--material-regular)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                  <Skeleton style={{ width: 80, height: 10, marginBottom: 8 }} />
                  <Skeleton style={{ width: 48, height: 20 }} />
                </div>
              ))}
            </div>
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--material-regular)' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: i < 5 ? '1px solid var(--separator)' : undefined, gap: 'var(--space-3)' }}>
                  <Skeleton className="flex-shrink-0" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                  <Skeleton style={{ width: 120, height: 12 }} />
                  <Skeleton style={{ width: 50, height: 18, borderRadius: 4 }} />
                  <Skeleton style={{ width: 200, height: 14, flex: 1 }} />
                </div>
              ))}
            </div>
          </>
        ) : activeTab === 'logs' ? (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }} className="summary-cards-grid">
              <TotalCard count={summary?.totalEntries ?? 0} />
              <ErrorCard count={summary?.errorCount ?? 0} />
              <SourcesCard cron={summary?.sources.cron ?? 0} config={summary?.sources.config ?? 0} />
            </div>

            {/* Log browser */}
            <LogBrowser
              entries={entries}
              summary={summary}
              loading={false}
              filter={filter}
              onFilterChange={setFilter}
            />
          </>
        ) : (
          <AuditBrowser />
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .summary-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
