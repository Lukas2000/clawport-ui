'use client'

import { useState } from 'react'
import type { Agent } from '@/lib/types'
import { ColorPicker } from './ColorPicker'
import { EmojiPicker } from './EmojiPicker'
import { ToolPicker } from './ToolPicker'
import { ManagerPicker } from './ManagerPicker'

interface EditAgentModalProps {
  agent: Agent
  allAgents: Agent[]
  onClose: () => void
  onSaved: () => void
}

export function EditAgentModal({ agent, allAgents, onClose, onSaved }: EditAgentModalProps) {
  const [name, setName] = useState(agent.name)
  const [title, setTitle] = useState(agent.title)
  const [description, setDescription] = useState(agent.description)
  const [emoji, setEmoji] = useState(agent.emoji)
  const [color, setColor] = useState(agent.color)
  const [tools, setTools] = useState<string[]>(agent.tools)
  const [reportsTo, setReportsTo] = useState<string | null>(agent.reportsTo)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'info' | 'tools'>('info')

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim(),
          description: description.trim(),
          emoji,
          color,
          tools,
          reportsTo,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update agent')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent')
      setSaving(false)
    }
  }

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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--material-thick)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 520,
          width: '90%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--separator)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Edit {agent.name}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: 18,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--separator)' }}>
          {(['info', 'tools'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: tab === t ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t === 'info' ? 'Details' : 'Tools'}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Name">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Title">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
              <Field label="Emoji">
                <EmojiPicker value={emoji} onChange={setEmoji} />
              </Field>
              <Field label="Color">
                <ColorPicker value={color} onChange={setColor} />
              </Field>
              <Field label="Reports To">
                <ManagerPicker agents={allAgents} value={reportsTo} onChange={setReportsTo} excludeId={agent.id} />
              </Field>
            </div>
          )}

          {tab === 'tools' && (
            <ToolPicker value={tools} onChange={setTools} />
          )}

          {error && (
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,69,58,0.08)', color: 'var(--system-red)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            <button onClick={handleSave} style={btnPrimary} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--separator)',
  background: 'var(--fill-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: 'var(--accent-contrast)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid var(--separator)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}
