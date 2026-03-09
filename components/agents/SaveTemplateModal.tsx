'use client'

import { useEffect, useState } from 'react'
import type { TemplateCategory } from '@/lib/types'

interface SaveTemplateModalProps {
  agentName: string
  content: string
  onClose: () => void
  onSaved: () => void
}

export function SaveTemplateModal({ agentName, content, onClose, onSaved }: SaveTemplateModalProps) {
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [category, setCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [name, setName] = useState(agentName)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        const cats = data.categories || []
        setCategories(cats)
        if (cats.length > 0) setCategory(cats[0].slug)
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    const cat = newCategory.trim() || category
    if (!cat) {
      setError('Select or create a category')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          slug,
          name: name.trim(),
          description: description.trim(),
          color: '#3b82f6',
          content,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save template')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
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
          padding: 24,
          maxWidth: 440,
          width: '90%',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>
          Save as Template
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Category
            </label>
            {categories.length > 0 ? (
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setNewCategory('') }}
                style={selectStyle}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
            ) : null}
            <input
              type="text"
              placeholder="Or create new category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,69,58,0.08)', color: 'var(--system-red)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={btnPrimary}>
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
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
