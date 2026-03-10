'use client'

import { useEffect, useState } from 'react'
import { Users, CircleDot, DollarSign, CheckCircle, Target } from 'lucide-react'
import { MetricCard } from './MetricCard'
import { IssueDistributionChart } from './IssueDistributionChart'
import type { Task, Agent, Goal } from '@/lib/types'

const STATUS_CHART_CONFIG: Record<string, { color: string; label: string }> = {
  backlog: { color: '#6B7280', label: 'Backlog' },
  todo: { color: '#3B82F6', label: 'Todo' },
  'in-progress': { color: '#F59E0B', label: 'In Progress' },
  review: { color: '#8B5CF6', label: 'Review' },
  done: { color: '#22C55E', label: 'Done' },
  cancelled: { color: '#9CA3AF', label: 'Cancelled' },
}

export function DashboardView() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/agents').then(r => r.ok ? r.json() : []),
      fetch('/api/tasks?exclude_hidden=true').then(r => r.ok ? r.json() : []),
      fetch('/api/goals').then(r => r.ok ? r.json() : []),
      fetch('/api/approvals').then(r => r.ok ? r.json() : []),
    ]).then(([agentsData, tasksData, goalsData, approvalsData]) => {
      setAgents(agentsData)
      setTasks(tasksData)
      setGoals(goalsData)
      setPendingApprovals(
        Array.isArray(approvalsData) ? approvalsData.filter((a: { status: string }) => a.status === 'pending').length : 0
      )
    }).catch(() => {})
  }, [])

  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length
  const activeGoals = goals.filter(g => g.status === 'active').length

  // Issue distribution data
  const statusCounts = new Map<string, number>()
  for (const t of tasks) {
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1)
  }
  const chartData = Object.entries(STATUS_CHART_CONFIG).map(([status, cfg]) => ({
    status,
    count: statusCounts.get(status) ?? 0,
    color: cfg.color,
    label: cfg.label,
  }))

  // Recent activity (latest tasks)
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
    .slice(0, 8)

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metric cards */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <MetricCard
          icon={Users}
          label="Active Agents"
          value={agents.length}
          color="#3B82F6"
        />
        <MetricCard
          icon={CircleDot}
          label="In Progress"
          value={inProgressCount}
          subtext={`of ${tasks.length} issues`}
          color="#F59E0B"
        />
        <MetricCard
          icon={Target}
          label="Active Goals"
          value={activeGoals}
          subtext={`of ${goals.length} total`}
          color="#8B5CF6"
        />
        <MetricCard
          icon={CheckCircle}
          label="Pending Approvals"
          value={pendingApprovals}
          color={pendingApprovals > 0 ? '#F59E0B' : '#22C55E'}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* Issue Distribution */}
        <div
          style={{
            flex: '1 1 300px',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--separator)',
            background: 'var(--material)',
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            Issue Distribution
          </h3>
          <IssueDistributionChart data={chartData} />
        </div>

        {/* Goal Progress */}
        <div
          style={{
            flex: '1 1 300px',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--separator)',
            background: 'var(--material)',
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            Goal Progress
          </h3>
          {goals.length === 0 ? (
            <div style={{ padding: '16px 0', color: 'var(--text-quaternary)', fontSize: '12px', textAlign: 'center' }}>
              No goals yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {goals.filter(g => g.status === 'active').slice(0, 5).map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.title}
                  </span>
                  <div
                    style={{
                      width: '60px',
                      height: '5px',
                      borderRadius: '3px',
                      background: 'var(--fill-quaternary)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: `${g.progress}%`,
                        height: '100%',
                        borderRadius: '3px',
                        background: g.progress >= 100 ? '#22C55E' : '#8B5CF6',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-quaternary)', width: '28px', textAlign: 'right' }}>
                    {g.progress}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--separator)',
          background: 'var(--material)',
        }}
      >
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
          Recent Activity
        </h3>
        {recentTasks.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--text-quaternary)', fontSize: '12px', textAlign: 'center' }}>
            No recent activity
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentTasks.map(t => {
              const agent = t.assignedAgentId ? agents.find(a => a.id === t.assignedAgentId) : null
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: STATUS_CHART_CONFIG[t.status]?.color ?? '#6B7280',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-quaternary)', flexShrink: 0 }}>
                    {t.identifier ?? t.id.slice(0, 6)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                  {agent && (
                    <span style={{ fontSize: '13px', flexShrink: 0 }} title={agent.name}>
                      {agent.emoji}
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--text-quaternary)', flexShrink: 0 }}>
                    {formatRelativeTime(t.updatedAt ?? t.createdAt)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
