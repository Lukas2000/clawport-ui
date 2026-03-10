'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, RotateCcw, Clock, Shield, MessageSquare } from 'lucide-react'
import type { Approval, ApprovalStatus, Agent, ApprovalRule } from '@/lib/types'

const STATUS_CONFIG: Record<ApprovalStatus, { color: string; label: string; bg: string }> = {
  pending: { color: 'var(--system-orange)', label: 'Pending', bg: 'rgba(255,159,10,0.1)' },
  approved: { color: 'var(--system-green)', label: 'Approved', bg: 'rgba(52,199,89,0.1)' },
  rejected: { color: 'var(--system-red)', label: 'Rejected', bg: 'rgba(255,69,58,0.1)' },
  revision_requested: { color: 'var(--system-blue)', label: 'Revision Requested', bg: 'rgba(0,122,255,0.1)' },
}

const STATUS_ICONS: Record<ApprovalStatus, typeof CheckCircle> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  revision_requested: RotateCcw,
}

const TABS: ApprovalStatus[] = ['pending', 'approved', 'rejected', 'revision_requested']

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

type PageTab = 'approvals' | 'rules'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [rules, setRules] = useState<ApprovalRule[]>([])
  const [tab, setTab] = useState<ApprovalStatus>('pending')
  const [pageTab, setPageTab] = useState<PageTab>('approvals')
  const [showCreate, setShowCreate] = useState(false)
  const [decisionNoteId, setDecisionNoteId] = useState<string | null>(null)
  const [decisionNote, setDecisionNote] = useState('')

  const load = useCallback(() => {
    fetch('/api/approvals').then(r => r.json()).then((d: unknown) => { if (Array.isArray(d)) setApprovals(d) }).catch(() => {})
    fetch('/api/agents').then(r => r.json()).then((d: unknown) => { if (Array.isArray(d)) setAgents(d) }).catch(() => {})
    fetch('/api/approval-rules').then(r => r.ok ? r.json() : []).then((d: unknown) => { if (Array.isArray(d)) setRules(d) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = approvals.filter(a => a.status === tab)
  const pendingCount = approvals.filter(a => a.status === 'pending').length

  function agentName(id: string | null) {
    if (!id) return 'Operator'
    const a = agents.find(ag => ag.id === id)
    return a ? `${a.emoji} ${a.name}` : id
  }

  async function decide(id: string, status: 'approved' | 'rejected' | 'revision_requested', note?: string) {
    await fetch(`/api/approvals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, decisionNote: note || undefined, decidedBy: 'operator' }),
    })
    setDecisionNoteId(null)
    setDecisionNote('')
    load()
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
          <div className="flex items-center" style={{ gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: pendingCount > 0 ? 'rgba(255,159,10,0.15)' : 'color-mix(in srgb, var(--system-green) 15%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle size={16} style={{ color: pendingCount > 0 ? 'var(--system-orange)' : 'var(--system-green)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
                Approvals
              </h1>
              <p style={{ fontSize: '12px', color: pendingCount > 0 ? 'var(--system-orange)' : 'var(--text-tertiary)', margin: 0, fontWeight: pendingCount > 0 ? 600 : 400 }}>
                {pendingCount > 0 ? `${pendingCount} pending review` : `${approvals.length} total`}
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>
            + Request Approval
          </button>
        </div>

        {/* Page-level tabs: Approvals | Rules */}
        <div className="flex items-center" style={{ padding: '0 24px 12px', gap: '8px' }}>
          {([
            { key: 'approvals' as const, label: 'Approvals', icon: MessageSquare },
            { key: 'rules' as const, label: 'Rules', icon: Shield },
          ]).map(t => {
            const isActive = pageTab === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setPageTab(t.key)}
                className="focus-ring"
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-fill)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Icon size={13} />
                {t.label}
                {t.key === 'rules' && rules.length > 0 && (
                  <span style={{ fontSize: '10px', padding: '0 5px', borderRadius: 8, background: 'var(--fill-quaternary)', color: 'var(--text-tertiary)' }}>
                    {rules.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 24px 24px', minHeight: 0 }}>
        {pageTab === 'approvals' ? (
          <>
            {showCreate && (
              <CreateApprovalForm
                agents={agents}
                onCreated={() => { setShowCreate(false); load() }}
                onCancel={() => setShowCreate(false)}
              />
            )}

            {/* Status tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
              {TABS.map(t => {
                const count = approvals.filter(a => a.status === t).length
                const cfg = STATUS_CONFIG[t]
                const isActive = tab === t
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="focus-ring"
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 500,
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? cfg.bg : 'transparent',
                      color: isActive ? cfg.color : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {cfg.label}
                    <span style={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      padding: '0 5px',
                      borderRadius: 8,
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'var(--fill-quaternary)',
                      color: isActive ? cfg.color : 'var(--text-tertiary)',
                    }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '800px' }}>
              {filtered.map(approval => {
                const cfg = STATUS_CONFIG[approval.status]
                const StatusIcon = STATUS_ICONS[approval.status]
                const showNoteInput = decisionNoteId === approval.id

                return (
                  <div
                    key={approval.id}
                    style={{
                      background: 'var(--material-regular)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      borderLeft: `3px solid ${cfg.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title row */}
                        <div className="flex items-center" style={{ gap: '8px', marginBottom: '4px' }}>
                          <StatusIcon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {approval.title}
                          </span>
                          {/* Type badge */}
                          {approval.approvalType && approval.approvalType !== 'manual' && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '8px',
                              background: 'color-mix(in srgb, var(--system-purple) 12%, transparent)',
                              color: 'var(--system-purple)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>
                              {approval.approvalType}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {approval.description && (
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px', paddingLeft: '22px' }}>
                            {approval.description}
                          </div>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center" style={{ gap: '12px', paddingLeft: '22px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            Requested by {agentName(approval.requestedByAgentId)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>
                            {timeAgo(approval.createdAt)}
                          </span>
                          {/* Decided by */}
                          {approval.decidedBy && approval.decidedAt && (
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              Decided by <strong style={{ fontWeight: 600 }}>{approval.decidedBy}</strong> {timeAgo(approval.decidedAt)}
                            </span>
                          )}
                        </div>

                        {/* Decision note */}
                        {approval.decisionNote && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginTop: '8px',
                            paddingLeft: '22px',
                            padding: '8px 12px 8px 22px',
                            background: 'var(--fill-quaternary)',
                            borderRadius: '6px',
                            borderLeft: `2px solid ${cfg.color}`,
                            marginLeft: '22px',
                          }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                              Decision Note
                            </span>
                            {approval.decisionNote}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {approval.status === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={() => decide(approval.id, 'approved')}
                            style={{ ...btnAction, background: 'var(--system-green)', color: '#fff' }}
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            onClick={() => {
                              if (showNoteInput) {
                                decide(approval.id, 'revision_requested', decisionNote)
                              } else {
                                setDecisionNoteId(approval.id)
                                setDecisionNote('')
                              }
                            }}
                            style={{ ...btnAction, background: 'var(--system-blue)', color: '#fff' }}
                          >
                            <RotateCcw size={12} /> Revise
                          </button>
                          <button
                            onClick={() => decide(approval.id, 'rejected')}
                            style={{ ...btnAction, background: 'var(--system-red)', color: '#fff' }}
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      )}

                      {/* Status badge for non-pending */}
                      {approval.status !== 'pending' && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '10px',
                            background: cfg.bg,
                            color: cfg.color,
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <StatusIcon size={11} />
                          {cfg.label}
                        </span>
                      )}
                    </div>

                    {/* Inline note input for revision */}
                    {showNoteInput && (
                      <div style={{ marginTop: '10px', paddingLeft: '22px', display: 'flex', gap: '6px' }}>
                        <input
                          value={decisionNote}
                          onChange={e => setDecisionNote(e.target.value)}
                          placeholder="Add a note for the revision request..."
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            fontSize: '12px',
                            border: '1px solid var(--system-blue)',
                            borderRadius: '6px',
                            background: 'var(--fill-quaternary)',
                            color: 'var(--text-primary)',
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') decide(approval.id, 'revision_requested', decisionNote)
                            if (e.key === 'Escape') { setDecisionNoteId(null); setDecisionNote('') }
                          }}
                        />
                        <button
                          onClick={() => decide(approval.id, 'revision_requested', decisionNote)}
                          style={{ ...btnSmall, background: 'var(--system-blue)', color: '#fff' }}
                        >
                          Send
                        </button>
                        <button
                          onClick={() => { setDecisionNoteId(null); setDecisionNote('') }}
                          style={{ ...btnSmall, background: 'var(--fill-quaternary)', color: 'var(--text-secondary)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                {React.createElement(STATUS_ICONS[tab], { size: 36, style: { color: 'var(--text-quaternary)', margin: '0 auto 10px', display: 'block' } })}
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  No {STATUS_CONFIG[tab].label.toLowerCase()} approvals
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {tab === 'pending' ? 'All caught up!' : `No approvals with status "${STATUS_CONFIG[tab].label}" yet.`}
                </div>
              </div>
            )}
          </>
        ) : (
          <ApprovalRulesPanel rules={rules} onReload={load} />
        )}
      </div>
    </div>
  )
}

/* ── Approval Rules Panel ────────────────────────────────────── */

function ApprovalRulesPanel({ rules, onReload }: { rules: ApprovalRule[]; onReload: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function addRule(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !trigger.trim()) return
    setSaving(true)
    try {
      await fetch('/api/approval-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), triggerCondition: trigger.trim(), description }),
      })
      setName('')
      setTrigger('')
      setDescription('')
      setShowAdd(false)
      onReload()
    } finally {
      setSaving(false)
    }
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch(`/api/approval-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    })
    onReload()
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Approval Rules
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            Rules that auto-trigger approval requests when conditions are met.
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={btnPrimary}>
          + Add Rule
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addRule} style={{ background: 'var(--material-regular)', borderRadius: '10px', padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Rule name" style={inputStyle} autoFocus />
          <input value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="Trigger condition (e.g. budget_threshold, agent_config_change)" style={inputStyle} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="submit" disabled={saving || !name.trim() || !trigger.trim()} style={btnPrimary}>Save</button>
            <button type="button" onClick={() => setShowAdd(false)} style={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      {rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Shield size={36} style={{ color: 'var(--text-quaternary)', margin: '0 auto 10px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            No rules configured
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Add rules to auto-trigger approvals for budget thresholds, config changes, etc.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rules.map(rule => (
            <div
              key={rule.id}
              style={{
                background: 'var(--material-regular)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                opacity: rule.enabled ? 1 : 0.5,
              }}
            >
              <button
                onClick={() => toggleRule(rule.id, !rule.enabled)}
                style={{
                  width: '32px',
                  height: '18px',
                  borderRadius: '9px',
                  border: 'none',
                  cursor: 'pointer',
                  background: rule.enabled ? 'var(--system-green)' : 'var(--fill-tertiary)',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 200ms',
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: rule.enabled ? '16px' : '2px',
                  transition: 'left 200ms',
                }} />
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {rule.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {rule.triggerCondition}
                </div>
                {rule.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {rule.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Create Form ─────────────────────────────────────────────── */

import React from 'react'

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
    <form onSubmit={submit} style={{ background: 'var(--material-regular)', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '800px' }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Approval title" style={inputStyle} autoFocus />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
      <select value={agentId} onChange={e => setAgentId(e.target.value)} style={inputStyle}>
        <option value="">Requesting agent (optional)</option>
        {agents.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
      </select>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button type="submit" disabled={saving || !title.trim()} style={btnPrimary}>Submit</button>
        <button type="button" onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </form>
  )
}

/* ── Styles ──────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  background: 'var(--fill-quaternary)',
  border: '1px solid var(--separator)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 14px',
  fontSize: '12px',
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '7px 14px',
  fontSize: '12px',
  fontWeight: 500,
  background: 'var(--fill-quaternary)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--separator)',
  borderRadius: '6px',
  cursor: 'pointer',
}

const btnAction: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '11px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

const btnSmall: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '11px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
}
