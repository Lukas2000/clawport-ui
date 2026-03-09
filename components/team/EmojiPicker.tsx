'use client'

import { useState } from 'react'

const EMOJI_GRID = [
  '🤖', '🧠', '🎯', '🔍', '📊', '💡', '🛡️', '⚡',
  '🎨', '✍️', '📝', '🔧', '🚀', '📈', '🌐', '💬',
  '🔬', '📋', '🎵', '🏗️', '🧪', '📡', '🔮', '🦾',
  '👁️', '🕵️', '🦅', '🐙', '🦊', '🐺', '🦁', '🐉',
  '⭐', '💎', '🔥', '❄️', '🌊', '🌙', '☀️', '🌿',
]

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [customInput, setCustomInput] = useState('')

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {EMOJI_GRID.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: value === emoji ? '2px solid var(--accent)' : '2px solid transparent',
              background: value === emoji ? 'var(--fill-secondary)' : 'transparent',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 100ms',
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Or type any emoji..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customInput.trim()) {
              onChange(customInput.trim())
              setCustomInput('')
            }
          }}
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--separator)',
            background: 'var(--fill-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        {customInput.trim() && (
          <button
            type="button"
            onClick={() => {
              onChange(customInput.trim())
              setCustomInput('')
            }}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Use
          </button>
        )}
      </div>
    </div>
  )
}
