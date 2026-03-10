'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { renderMarkdown } from '@/lib/sanitize'
import { TemplatePicker } from '@/components/team/TemplatePicker'
import type { AgentTemplate } from '@/lib/types'

interface ConfigFileEditorProps {
  agentId: string
  filename: string
  label: string
  onSaveAsTemplate?: () => void
}

export function ConfigFileEditor({ agentId, filename, label, onSaveAsTemplate }: ConfigFileEditorProps) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const [content, setContent] = useState('')
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)

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

      // After saving a config file, refresh server-side data and SWR caches
      // to propagate changes (especially title/role changes from SOUL.md updates)
      router.refresh()
      mutate('/api/agents', undefined, { revalidate: true })

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
          {filename === 'SOUL.md' && (
            <button
              onClick={() => { setSelectedTemplate(null); setShowTemplatePicker(true) }}
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
              Load Template
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

      {/* Load Template modal */}
      {showTemplatePicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowTemplatePicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--material-thick)', borderRadius: 'var(--radius-xl)', padding: 24, width: '90%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-modal)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Load Template</h3>
              <button onClick={() => setShowTemplatePicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <TemplatePicker selected={selectedTemplate} onSelect={setSelectedTemplate} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setShowTemplatePicker(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--separator)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                disabled={!selectedTemplate}
                onClick={() => {
                  if (selectedTemplate) {
                    setContent(selectedTemplate.content)
                    setShowTemplatePicker(false)
                  }
                }}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: selectedTemplate ? 'var(--accent)' : 'var(--fill-secondary)', color: selectedTemplate ? '#fff' : 'var(--text-quaternary)', fontSize: 14, fontWeight: 600, cursor: selectedTemplate ? 'pointer' : 'not-allowed' }}
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
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
