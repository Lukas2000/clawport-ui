'use client'

import { useState } from 'react'
import type { Agent, AgentTemplate } from '@/lib/types'
import { TemplatePicker } from './TemplatePicker'
import { ColorPicker } from './ColorPicker'
import { EmojiPicker } from './EmojiPicker'
import { ToolPicker } from './ToolPicker'
import { ManagerPicker } from './ManagerPicker'

interface AddAgentModalProps {
  agents: Agent[]
  onClose: () => void
  onCreated: (agent: Agent) => void
}

type Step = 'template' | 'details' | 'tools'

export function AddAgentModal({ agents, onClose, onCreated }: AddAgentModalProps) {
  const [step, setStep] = useState<Step>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🤖')
  const [color, setColor] = useState('#3B82F6')
  const [tools, setTools] = useState<string[]>(['read', 'write'])
  const [reportsTo, setReportsTo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-set the root agent as default manager
  const rootAgent = agents.find((a) => !a.reportsTo)
  if (reportsTo === null && rootAgent && agents.length > 0) {
    // Only set once
  }

  function handleTemplateSelect(template: AgentTemplate | null) {
    setSelectedTemplate(template)
    if (template) {
      setName(template.name)
      setColor(template.color)
      setDescription(template.description)
    }
  }

  function handleNextFromTemplate() {
    setStep('details')
    if (!reportsTo && rootAgent) {
      setReportsTo(rootAgent.id)
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim() || 'Agent',
          emoji,
          color,
          reportsTo,
          tools,
          description: description.trim() || `${name.trim()} agent.`,
          soulContent: selectedTemplate?.content || undefined,
          templateRef: selectedTemplate ? `${selectedTemplate.category}/${selectedTemplate.slug}` : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create agent')
      }

      const agent = await res.json()
      onCreated(agent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
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
          maxWidth: 560,
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
            Add Agent
          </h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {['template', 'details', 'tools'].map((s, i) => (
              <div
                key={s}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: step === s ? 'var(--accent)' : i < ['template', 'details', 'tools'].indexOf(step) ? 'var(--accent)' : 'var(--fill-quaternary)',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* Step 1: Template */}
          {step === 'template' && (
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Choose a template to get started, or create a custom agent.
              </p>
              <TemplatePicker selected={selectedTemplate} onSelect={handleTemplateSelect} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button onClick={onClose} style={btnSecondary}>Cancel</button>
                <button onClick={handleNextFromTemplate} style={btnPrimary}>
                  {selectedTemplate ? `Use "${selectedTemplate.name}"` : 'Custom Agent'} &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Scout, Analyst, Writer..."
                  style={inputStyle}
                  autoFocus
                />
              </Field>

              <Field label="Title">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Research Agent, Content Writer..."
                  style={inputStyle}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this agent does..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </Field>

              <Field label="Emoji">
                <EmojiPicker value={emoji} onChange={setEmoji} />
              </Field>

              <Field label="Color">
                <ColorPicker value={color} onChange={setColor} />
              </Field>

              <Field label="Reports To">
                <ManagerPicker agents={agents} value={reportsTo} onChange={setReportsTo} />
              </Field>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button onClick={() => setStep('template')} style={btnSecondary}>&larr; Back</button>
                <button onClick={() => setStep('tools')} style={btnPrimary} disabled={!name.trim()}>
                  Tools &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tools */}
          {step === 'tools' && (
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Select the tools this agent will have access to.
              </p>
              <ToolPicker value={tools} onChange={setTools} />

              {error && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,69,58,0.08)', color: 'var(--system-red)', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                <button onClick={() => setStep('details')} style={btnSecondary}>&larr; Back</button>
                <button onClick={handleSubmit} style={btnPrimary} disabled={saving || !name.trim()}>
                  {saving ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </div>
          )}
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
