'use client'

import { useState, useEffect } from 'react'
import type { Task, Agent, IssueLabel, TaskComment, TaskStatus, TaskPriority, Project, AuditEntry } from '@/lib/types'
import { AgentAvatar } from '@/components/AgentAvatar'
import { StatusIcon, STATUS_CONFIG } from './StatusIcon'
import { PriorityIcon, PRIORITY_CONFIG } from './PriorityIcon'
import { X, ChevronRight, MessageSquare, GitBranch, Activity } from 'lucide-react'

interface IssueDetailProps {
  task: Task
  agents: Agent[]
  projects?: Project[]
  allLabels: IssueLabel[]
  taskLabels: IssueLabel[]
  comments: TaskComment[]
  subIssues: Task[]
  ancestry: Task[]
  onClose: () => void
  onUpdate: (data: Record<string, unknown>) => void
  onAddComment: (content: string) => void
}

type Tab = 'comments' | 'sub-issues' | 'activity'

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '32px' }}>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          width: '72px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
  renderOption?: (v: string) => React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '12px',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
      }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--separator)')}
      onBlur={(e) => (e.target.style.borderColor = 'transparent')}
    >
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

const ACTOR_COLORS: Record<string, string> = {
  operator: 'var(--system-blue)',
  agent: 'var(--system-purple)',
  system: 'var(--text-tertiary)',
}

const ACTION_VERBS: Record<string, string> = {
  'task.created': 'created this issue',
  'task.updated': 'updated this issue',
  'task.deleted': 'deleted this issue',
}

export function IssueDetail({
  task,
  agents,
  projects,
  allLabels,
  taskLabels,
  comments,
  subIssues,
  ancestry,
  onClose,
  onUpdate,
  onAddComment,
}: IssueDetailProps) {
  const [tab, setTab] = useState<Tab>('comments')
  const [commentDraft, setCommentDraft] = useState('')
  const [activityEntries, setActivityEntries] = useState<AuditEntry[]>([])
  const agent = task.assignedAgentId ? agents.find(a => a.id === task.assignedAgentId) ?? null : null
  const project = task.projectId && projects ? projects.find(p => p.id === task.projectId) ?? null : null

  const statuses: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done', 'cancelled']
  const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

  // Load activity when tab switches to activity
  useEffect(() => {
    if (tab !== 'activity') return
    fetch(`/api/audit?entityType=task&entityId=${task.id}&limit=50`)
      .then(r => r.ok ? r.json() : { entries: [] })
      .then((data: { entries: AuditEntry[] }) => setActivityEntries(data.entries ?? []))
      .catch(() => {})
  }, [tab, task.id])

  function handleSubmitComment() {
    if (!commentDraft.trim()) return
    onAddComment(commentDraft.trim())
    setCommentDraft('')
  }

  function agentName(id: string | null): string {
    if (!id) return 'System'
    return agents.find(a => a.id === id)?.name ?? id
  }

  return (
    <div
      style={{
        width: '380px',
        height: '100%',
        borderLeft: '1px solid var(--separator)',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
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
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
          {ancestry.slice().reverse().map(a => (
            <span
              key={a.id}
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-quaternary)',
                whiteSpace: 'nowrap',
              }}
            >
              {a.identifier ?? a.id.slice(0, 6)}
              <ChevronRight size={10} style={{ margin: '0 2px', verticalAlign: 'middle' }} />
            </span>
          ))}
          <span
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {task.identifier ?? task.id.slice(0, 8)}
          </span>
          {/* Project badge */}
          {project && (
            <span style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              marginLeft: '4px',
            }}>
              · {project.name}
            </span>
          )}
        </div>
        <button
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

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Title */}
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 6px',
            lineHeight: 1.3,
          }}
        >
          {task.title}
        </h2>

        {/* Description */}
        {task.description && (
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: '0 0 16px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {task.description}
          </p>
        )}

        {/* Properties */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '12px 0',
            borderTop: '1px solid var(--separator)',
            borderBottom: '1px solid var(--separator)',
            marginBottom: '16px',
          }}
        >
          <PropertyRow label="Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <StatusIcon status={task.status} size={12} />
              <InlineSelect
                value={task.status}
                options={statuses}
                onChange={(v) => onUpdate({ status: v })}
                renderOption={(v) => STATUS_CONFIG[v as TaskStatus]?.label ?? v}
              />
            </div>
          </PropertyRow>

          <PropertyRow label="Priority">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PriorityIcon priority={task.priority} size={12} />
              <InlineSelect
                value={task.priority}
                options={priorities}
                onChange={(v) => onUpdate({ priority: v })}
                renderOption={(v) => PRIORITY_CONFIG[v as TaskPriority]?.label ?? v}
              />
            </div>
          </PropertyRow>

          <PropertyRow label="Labels">
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
              {taskLabels.map(l => (
                <span
                  key={l.id}
                  style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: `color-mix(in srgb, ${l.color} 15%, transparent)`,
                    color: l.color,
                    lineHeight: '16px',
                  }}
                >
                  {l.name}
                </span>
              ))}
              {taskLabels.length === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>No labels</span>
              )}
            </div>
          </PropertyRow>

          <PropertyRow label="Assignee">
            {agent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AgentAvatar agent={agent} size={18} borderRadius={5} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{agent.name}</span>
              </div>
            ) : (
              <select
                value=""
                onChange={(e) => onUpdate({ assignedAgentId: e.target.value || null })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '12px',
                  color: 'var(--text-quaternary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">Unassigned</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </PropertyRow>

          {/* Project */}
          <PropertyRow label="Project">
            {projects && projects.length > 0 ? (
              <select
                value={task.projectId ?? ''}
                onChange={(e) => onUpdate({ projectId: e.target.value || null })}
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '4px',
                  padding: '2px 4px',
                  fontSize: '12px',
                  color: task.projectId ? 'var(--text-primary)' : 'var(--text-quaternary)',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--separator)')}
                onBlur={(e) => (e.target.style.borderColor = 'transparent')}
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>
                {project?.name ?? 'None'}
              </span>
            )}
          </PropertyRow>

          {task.dueDate && (
            <PropertyRow label="Due date">
              <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {formatDate(task.dueDate)}
              </span>
            </PropertyRow>
          )}

          {/* Started */}
          {task.startedAt && (
            <PropertyRow label="Started">
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                {formatDate(task.startedAt)}
              </span>
            </PropertyRow>
          )}

          {/* Created */}
          <PropertyRow label="Created">
            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
              {formatDate(task.createdAt)}
            </span>
          </PropertyRow>

          {/* Updated */}
          <PropertyRow label="Updated">
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {relativeTime(task.updatedAt ?? task.createdAt)}
            </span>
          </PropertyRow>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--separator)',
            marginBottom: '12px',
          }}
        >
          {([
            { key: 'comments' as Tab, icon: MessageSquare, label: 'Comments', count: comments.length },
            { key: 'sub-issues' as Tab, icon: GitBranch, label: 'Sub-issues', count: subIssues.length },
            { key: 'activity' as Tab, icon: Activity, label: 'Activity', count: 0 },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? 'var(--accent)' : 'var(--text-tertiary)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <t.icon size={12} />
              {t.label}
              {t.count > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--fill-quaternary)',
                    borderRadius: '3px',
                    padding: '0 4px',
                    color: 'var(--text-quaternary)',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'comments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {comments.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-quaternary)', padding: '8px 0' }}>
                No comments yet.
              </span>
            )}
            {comments.map(c => {
              const commentAgent = c.authorType === 'agent' && c.authorId ? agents.find(a => a.id === c.authorId) : null
              return (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {commentAgent && <AgentAvatar agent={commentAgent} size={16} borderRadius={4} />}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: c.authorType === 'agent' ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {c.authorType === 'agent'
                        ? (commentAgent ? commentAgent.name : (c.authorId ?? 'Agent'))
                        : 'You'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-quaternary)' }}>
                      {formatDate(c.createdAt)}, {new Date(c.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {c.content}
                  </p>
                </div>
              )
            })}

            {/* Comment input */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment() }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentDraft.trim()}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: commentDraft.trim() ? 'var(--accent)' : 'var(--fill-tertiary)',
                  color: commentDraft.trim() ? 'white' : 'var(--text-quaternary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: commentDraft.trim() ? 'pointer' : 'default',
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {tab === 'sub-issues' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {subIssues.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-quaternary)', padding: '8px 0' }}>
                No sub-issues.
              </span>
            )}
            {subIssues.map(sub => (
              <div
                key={sub.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                }}
              >
                <StatusIcon status={sub.status} size={12} />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {sub.identifier}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {activityEntries.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-quaternary)', padding: '8px 0' }}>
                No activity recorded for this issue.
              </span>
            ) : (
              activityEntries.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--separator-light, var(--separator))',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: ACTOR_COLORS[entry.actorType] ?? 'var(--text-tertiary)',
                      flexShrink: 0,
                      marginTop: '5px',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      <span style={{ fontWeight: 600, color: ACTOR_COLORS[entry.actorType] ?? 'var(--text-tertiary)' }}>
                        {entry.actorType === 'agent' && entry.agentId ? agentName(entry.agentId) : entry.actorType === 'operator' ? 'You' : 'System'}
                      </span>
                      {' '}
                      {ACTION_VERBS[entry.action] ?? entry.action.replace(/\./g, ' ')}
                    </div>
                    {entry.details && typeof entry.details === 'object' && Object.keys(entry.details).length > 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--text-quaternary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: 'var(--text-quaternary)', marginTop: '2px' }}>
                      {relativeTime(entry.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
