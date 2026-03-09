'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Approval, ApprovalStatus, Agent } from '@/lib/types'

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'var(--system-orange)',
  approved: 'var(--system-green)',
  rejected: 'var(--system-red)',
}

const TABS: ApprovalStatus[] = ['pending', 'approved', 'rejected']

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [tab, setTab] = useState<ApprovalStatus>('pending')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    fetch('/api/approvals').then((r) => r.json()).then((d: unknown) => { if (Array.isArray(d)) setApprovals(d) }).catch(() => {})
    fetch('/api/agents').then((r) => r.json()).then((d: unknown) => { if (Array.isArray(d)) setAgents(d) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = approvals.filter((a) => a.status === tab)
  const pendingCount = approvals.filter((a) => a.status === 'pending').length

  function agentName(id: string | null) {
    if (!id) return 'Unknown'
    return agents.find((a) => a.id === id)?.name ?? id
  }

  async function decide(id: string, status: 'approved' | 'rejected', note?: string) {
    await fetch(`/api/approvals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, decisionNote: note }),
    })
    load()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Approvals
          </h1>
          {pendingCount > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--system-orange)', marginTop: '2px' }}>
              {pendingCount} pending
            </p>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          + Request Approval
        </button>
      </div>

      {showCreate && (
        <CreateApprovalForm
          agents={agents}
          onCreated={() => { setShowCreate(false); load() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {TABS.map((t) => {
          const count = approvals.filter((a) => a.status === t).length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: tab === t ? 600 : 500,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: tab === t ? 'var(--accent-fill)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t} ({count})
            </button>
          )
        })}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((approval) => (
          <div
            key={approval.id}
            style={{
              background: 'var(--material-regular)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {approval.title}
                </div>
                {approval.description && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                    {approval.description}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Requested by {agentName(approval.requestedByAgentId)} &middot; {new Date(approval.createdAt).toLocaleDateString()}
                </div>
                {approval.decisionNote && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
                    Note: {approval.decisionNote}
                  </div>
                )}
              </div>

              {approval.status === 'pending' ? (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => decide(approval.id, 'approved')} style={{ ...btnSmall, background: 'var(--system-green)', color: '#fff' }}>
                    Approve
                  </button>
                  <button onClick={() => decide(approval.id, 'rejected')} style={{ ...btnSmall, background: 'var(--system-red)', color: '#fff' }}>
                    Reject
                  </button>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '10px',
                    background: STATUS_COLORS[approval.status] + '18',
                    color: STATUS_COLORS[approval.status],
                    textTransform: 'capitalize',
                    flexShrink: 0,
                  }}
                >
                  {approval.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
          No {tab} approvals.
        </div>
      )}
    </div>
  )
}

function CreateApprovalForm({ agents, onCreated, onCancel }: { agents: Agent[]; onCreated: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [agentId, setAgentId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          requestedByAgentId: agentId || null,
        }),
      })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--material-regular)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Approval title" style={inputStyle} autoFocus />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
      <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={inputStyle}>
        <option value="">Requesting agent (optional)</option>
        {agents.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
      </select>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={saving || !title.trim()} style={btnPrimary}>Submit</button>
        <button type="button" onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  background: 'var(--fill-quaternary)',
  border: '1px solid var(--separator)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  background: 'var(--fill-quaternary)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--separator)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

const btnSmall: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: '11px',
  fontWeight: 600,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}
