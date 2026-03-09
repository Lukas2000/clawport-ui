'use client'

import { useState, useRef, useEffect } from 'react'

interface InlineEditFieldProps {
  value: string
  onSave: (value: string) => Promise<void>
  fontSize?: string
  fontWeight?: number
  color?: string
  placeholder?: string
  multiline?: boolean
}

export function InlineEditField({
  value,
  onSave,
  fontSize = 'var(--text-body)',
  fontWeight = 500,
  color = 'var(--text-primary)',
  placeholder = 'Click to edit',
  multiline = false,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [hover, setHover] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  async function handleSave() {
    if (draft.trim() === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft.trim())
      setEditing(false)
    } catch {
      // revert
      setDraft(value)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setDraft(value)
      setEditing(false)
    }
  }

  if (editing) {
    const sharedStyle: React.CSSProperties = {
      width: '100%',
      padding: '4px 8px',
      borderRadius: 6,
      border: '1px solid var(--accent)',
      background: 'var(--fill-tertiary)',
      color,
      fontSize,
      fontWeight,
      outline: 'none',
      boxSizing: 'border-box',
    }

    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            rows={3}
            style={{ ...sharedStyle, resize: 'vertical' }}
            disabled={saving}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            style={sharedStyle}
            disabled={saving}
          />
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer',
        fontSize,
        fontWeight,
        color: value ? color : 'var(--text-quaternary)',
        lineHeight: 1.5,
        padding: '2px 4px',
        marginLeft: -4,
        borderRadius: 6,
        border: hover ? '1px dashed var(--text-quaternary)' : '1px dashed transparent',
        transition: 'border-color 150ms',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
      title="Click to edit"
    >
      <span>{value || placeholder}</span>
      {hover && (
        <span style={{ fontSize: 10, color: 'var(--text-quaternary)', flexShrink: 0 }}>
          &#9998;
        </span>
      )}
    </div>
  )
}
