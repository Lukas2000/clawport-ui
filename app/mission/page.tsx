'use client'

import { useEffect, useState, useCallback } from 'react'
import { renderMarkdown } from '@/lib/sanitize'
import type { MissionData, MissionValue, Goal } from '@/lib/types'
import Link from 'next/link'

export default function MissionPage() {
  const [data, setData] = useState<MissionData | null>(null)
  const [userMd, setUserMd] = useState<string | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch('/api/mission')
      .then((r) => r.json())
      .then((d) => {
        setData({ mission: d.mission, vision: d.vision, values: d.values })
        setUserMd(d.userMd ?? null)
      })
      .catch(() => {})
    fetch('/api/goals')
      .then((r) => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setGoals(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  async function save(updated: MissionData) {
    setSaving(true)
    try {
      await fetch('/api/mission', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setData(updated)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(field: string, value: string) {
    setEditing(field)
    setDraft(value)
  }

  function commitEdit(field: string) {
    if (!data) return
    if (field === 'mission') save({ ...data, mission: draft })
    else if (field === 'vision') save({ ...data, vision: draft })
  }

  function updateValue(index: number, val: MissionValue) {
    if (!data) return
    const values = [...data.values]
    values[index] = val
    save({ ...data, values })
  }

  function addValue() {
    if (!data) return
    save({ ...data, values: [...data.values, { title: 'New Value', description: 'Describe this value.' }] })
  }

  function removeValue(index: number) {
    if (!data) return
    const values = data.values.filter((_, i) => i !== index)
    save({ ...data, values })
  }

  if (!data) {
    return (
      <div style={{ padding: '32px', color: 'var(--text-tertiary)' }}>Loading...</div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      {/* Mission Statement */}
      <section style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: '12px',
          }}
        >
          Our Mission
        </div>
        {editing === 'mission' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                fontSize: '20px',
                fontStyle: 'italic',
                background: 'var(--fill-quaternary)',
                border: '1px solid var(--separator)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => commitEdit('mission')} disabled={saving} style={btnStyle}>
                Save
              </button>
              <button onClick={() => setEditing(null)} style={btnSecondaryStyle}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => startEdit('mission', data.mission)}
            style={{
              fontSize: '24px',
              fontStyle: 'italic',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              cursor: 'pointer',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              transition: 'background 150ms',
            }}
            title="Click to edit"
          >
            &ldquo;{data.mission}&rdquo;
          </p>
        )}
      </section>

      {/* Vision */}
      <section style={{ marginBottom: '48px' }}>
        <div style={sectionLabelStyle}>Vision</div>
        {editing === 'vision' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '12px',
                fontSize: '15px',
                background: 'var(--fill-quaternary)',
                border: '1px solid var(--separator)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => commitEdit('vision')} disabled={saving} style={btnStyle}>
                Save
              </button>
              <button onClick={() => setEditing(null)} style={btnSecondaryStyle}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => startEdit('vision', data.vision)}
            style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
            }}
            title="Click to edit"
          >
            {data.vision}
          </p>
        )}
      </section>

      {/* Core Values */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={sectionLabelStyle}>Core Values</div>
          <button onClick={addValue} style={btnStyle}>
            + Add Value
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {data.values.map((val, i) => (
            <ValueCard key={i} value={val} onChange={(v) => updateValue(i, v)} onRemove={() => removeValue(i)} />
          ))}
        </div>
      </section>

      {/* Goals summary */}
      {goals.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={sectionLabelStyle}>Goals Progress</div>
            <Link href="/goals" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
              View all goals →
            </Link>
          </div>
          {(() => {
            const active = goals.filter(g => g.status === 'active')
            const completed = goals.filter(g => g.status === 'completed')
            const avgProgress = active.length > 0
              ? Math.round(active.reduce((sum, g) => sum + g.progress, 0) / active.length)
              : 0
            return (
              <div style={{ background: 'var(--material-regular)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{goals.length}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>total goals</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--system-green)', lineHeight: 1 }}>{completed.length}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>completed</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{avgProgress}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>avg progress</span>
                  </div>
                </div>
                {/* Overall progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    <span>Active goals progress</span>
                    <span>{active.length} active</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--fill-quaternary)', overflow: 'hidden' }}>
                    <div style={{ width: `${avgProgress}%`, height: '100%', borderRadius: '3px', background: avgProgress >= 100 ? '#22C55E' : 'var(--accent)', transition: 'width 300ms' }} />
                  </div>
                </div>
                {/* Top active goals */}
                {active.slice(0, 3).map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                    <div style={{ width: '80px', height: '4px', borderRadius: '2px', background: 'var(--fill-quaternary)', flexShrink: 0 }}>
                      <div style={{ width: `${g.progress}%`, height: '100%', borderRadius: '2px', background: g.progress >= 100 ? '#22C55E' : 'var(--accent)' }} />
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', width: '28px', textAlign: 'right', flexShrink: 0 }}>{g.progress}%</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </section>
      )}

      {/* Company Context (USER.md) */}
      {userMd && (
        <section>
          <div style={sectionLabelStyle}>Company Context</div>
          <div
            style={{
              background: 'var(--material-regular)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(userMd) }}
          />
        </section>
      )}
    </div>
  )
}

function ValueCard({
  value,
  onChange,
  onRemove,
}: {
  value: MissionValue
  onChange: (v: MissionValue) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(value.title)
  const [desc, setDesc] = useState(value.description)

  function commit() {
    onChange({ title, description: desc })
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={cardStyle}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...inputStyle, fontWeight: 600 }}
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={commit} style={btnStyle}>Save</button>
          <button onClick={() => setEditing(false)} style={btnSecondaryStyle}>Cancel</button>
          <button onClick={onRemove} style={{ ...btnSecondaryStyle, color: 'var(--system-red)' }}>Remove</button>
        </div>
      </div>
    )
  }

  return (
    <div onClick={() => setEditing(true)} style={{ ...cardStyle, cursor: 'pointer' }} title="Click to edit">
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {value.title}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {value.description}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--material-regular)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  marginBottom: '12px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  fontSize: '13px',
  background: 'var(--fill-quaternary)',
  border: '1px solid var(--separator)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

const btnSecondaryStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 500,
  background: 'var(--fill-quaternary)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--separator)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}
