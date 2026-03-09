'use client'

import { useEffect, useState, useCallback } from 'react'
import { renderMarkdown } from '@/lib/sanitize'

interface SoulEditorProps {
  agentId: string
}

export function SoulEditor({ agentId }: SoulEditorProps) {
  const [content, setContent] = useState('')
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/agents/${agentId}/soul`)
      .then((r) => {
        if (!r.ok) throw new Error('Could not load SOUL.md')
        return r.json()
      })
      .then((data) => {
        setContent(data.content)
        setLastModified(data.lastModified)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [agentId])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/agents/${agentId}/soul`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setLastModified(new Date().toISOString())
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', color: 'var(--text-tertiary)' }}>
        Loading...
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
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {lastModified && (
            <span style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)' }}>
              Last modified: {new Date(lastModified).toLocaleString()}
            </span>
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
          }}
          spellCheck={false}
        />
      )}
    </div>
  )
}
