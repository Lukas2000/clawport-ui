'use client'

const AVAILABLE_TOOLS = [
  { id: 'read', label: 'Read', icon: '📁', description: 'Read files and data' },
  { id: 'write', label: 'Write', icon: '✏️', description: 'Write and create files' },
  { id: 'exec', label: 'Exec', icon: '💻', description: 'Execute commands' },
  { id: 'message', label: 'Message', icon: '🔔', description: 'Send messages to other agents' },
  { id: 'web_search', label: 'Web Search', icon: '🔍', description: 'Search the web' },
  { id: 'web_fetch', label: 'Web Fetch', icon: '🌐', description: 'Fetch web pages' },
  { id: 'edit', label: 'Edit', icon: '✂️', description: 'Edit existing files' },
  { id: 'sessions_spawn', label: 'Sessions Spawn', icon: '🔄', description: 'Spawn sub-sessions' },
  { id: 'memory_search', label: 'Memory Search', icon: '🧠', description: 'Search memory store' },
  { id: 'tts', label: 'TTS', icon: '💬', description: 'Text-to-speech' },
]

interface ToolPickerProps {
  value: string[]
  onChange: (tools: string[]) => void
}

export function ToolPicker({ value, onChange }: ToolPickerProps) {
  function toggle(toolId: string) {
    if (value.includes(toolId)) {
      onChange(value.filter((t) => t !== toolId))
    } else {
      onChange([...value, toolId])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {AVAILABLE_TOOLS.map((tool) => {
        const selected = value.includes(tool.id)
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => toggle(tool.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid ' + (selected ? 'var(--accent)' : 'var(--separator)'),
              background: selected ? 'var(--accent)11' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 100ms',
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{tool.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{tool.label}</span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                flex: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {tool.description}
            </span>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: '1.5px solid ' + (selected ? 'var(--accent)' : 'var(--text-quaternary)'),
                background: selected ? 'var(--accent)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: 'white',
                flexShrink: 0,
              }}
            >
              {selected ? '✓' : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
