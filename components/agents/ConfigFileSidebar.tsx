'use client'

import { useEffect, useState } from 'react'
import type { AgentConfigFile } from '@/lib/types'

interface ConfigFileSidebarProps {
  agentId: string
  activeFile: string
  onSelect: (filename: string) => void
}

export function ConfigFileSidebar({ agentId, activeFile, onSelect }: ConfigFileSidebarProps) {
  const [files, setFiles] = useState<AgentConfigFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/files`)
      .then((r) => r.json())
      .then((data) => {
        setFiles(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  if (loading) {
    return (
      <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 13 }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-quaternary)',
          padding: '8px 12px 4px',
        }}
      >
        Config Files
      </div>
      {files.map((file) => {
        const isActive = file.filename === activeFile
        return (
          <button
            key={file.filename}
            onClick={() => onSelect(file.filename)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? 'var(--fill-secondary)' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 100ms',
              color: 'var(--text-primary)',
            }}
          >
            {/* Custom/default dot */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: file.isCustom ? 'var(--system-green)' : 'var(--text-quaternary)',
                flexShrink: 0,
              }}
              title={file.isCustom ? 'Custom' : 'Default template'}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {file.filename}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {file.description}
              </div>
            </div>
          </button>
        )
      })}

      {/* Legend */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--separator)', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-quaternary)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--system-green)' }} />
          Custom
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-quaternary)' }} />
          Default template
        </div>
      </div>
    </div>
  )
}
