'use client'

import { useEffect, useState, useCallback } from 'react'
import { renderMarkdown } from '@/lib/sanitize'

interface ConfigFileEditorProps {
  agentId: string
  filename: string
  label: string
  onSaveAsTemplate?: () => void
}

export function ConfigFileEditor({ agentId, filename, label, onSaveAsTemplate }: ConfigFileEditorProps) {
  const [content, setContent] = useState('')
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [reverting, setReverting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/agents/${agentId}/files/${encodeURIComponent(filename)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${filename}`)
        return r.json()
      })
      .then((data) => {
        setContent(data.content)
        setLastModified(data.lastModified)
        setIsCustom(data.isCustom)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [agentId, filename])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/agents/${agentId}/files/${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setIsCustom(true)
      setLastModified(new Date().toISOString())
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function revert() {
    setReverting(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to revert')
      load() // reload to get default template
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setReverting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', color: 'var(--text-tertiary)' }}>
        Loading {label}...
      </div>
    )
  }

  if (error && !content) {
    return (
      <div style={{ padding: 'var(--space-4)', color: 'var(--system-red)', fontSize: 'var(--text-footnote)' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Default template banner */}
      {!isCustom && (
        <div
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: 'var(--fill-secondary)',
            border: '1px solid var(--separator)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-quaternary)', flexShrink: 0 }} />
          Using default template. Save to create a custom version.
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setShowPreview(false)}
            style={{
              padding: '4px 12px',
              fontSize: 'var(--text-caption1)',
              fontWeight: !showPreview ? 600 : 500,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: !showPreview ? 'var(--accent-fill)' : 'transparent',
              color: !showPreview ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            onClick={() => setShowPreview(true)}
            style={{
              padding: '4px 12px',
              fontSize: 'var(--text-caption1)',
              fontWeight: showPreview ? 600 : 500,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: showPreview ? 'var(--accent-fill)' : 'transparent',
              color: showPreview ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Preview
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {lastModified && (
            <span style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)' }}>
              {new Date(lastModified).toLocaleString()}
            </span>
          )}
          {isCustom && filename !== 'SOUL.md' && (
            <button
              onClick={revert}
              disabled={reverting}
              style={{
                padding: '4px 12px',
                fontSize: 'var(--text-caption1)',
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--separator)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: reverting ? 'not-allowed' : 'pointer',
              }}
            >
              {reverting ? 'Reverting...' : 'Revert to Default'}
            </button>
          )}
          {onSaveAsTemplate && filename === 'SOUL.md' && (
            <button
              onClick={onSaveAsTemplate}
              style={{
                padding: '4px 12px',
                fontSize: 'var(--text-caption1)',
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--separator)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Save as Template
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '6px 16px',
              fontSize: 'var(--text-caption1)',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 'var(--text-caption2)', color: 'var(--system-red)' }}>{error}</div>
      )}

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          style={{
            background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            fontSize: 'var(--text-body)',
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            minHeight: 300,
            overflow: 'auto',
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            width: '100%',
            minHeight: 400,
            padding: 'var(--space-4)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption1)',
            lineHeight: 1.6,
            background: 'var(--bg)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--separator)',
            borderRadius: 'var(--radius-md)',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          spellCheck={false}
        />
      )}
    </div>
  )
}
