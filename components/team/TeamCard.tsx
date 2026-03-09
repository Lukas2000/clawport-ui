'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { Agent } from '@/lib/types'

interface TeamCardProps {
  agent: Agent
  onEdit: () => void
  onDelete: () => void
  onChangeManager: () => void
}

export function TeamCard({ agent, onEdit, onDelete, onChangeManager }: TeamCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div
      style={{
        background: 'var(--material-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: agent.color + '22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {agent.emoji}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {agent.title}
          </div>
        </div>

        {/* Three-dot menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-quaternary)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 6,
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            &#x22EE;
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--material-thick)',
                borderRadius: 10,
                border: '1px solid var(--separator)',
                boxShadow: 'var(--shadow-modal)',
                minWidth: 160,
                zIndex: 50,
                padding: 4,
              }}
            >
              <MenuButton onClick={() => { setMenuOpen(false); onEdit() }}>
                Edit Details
              </MenuButton>
              <MenuButton onClick={() => { setMenuOpen(false); onChangeManager() }}>
                Change Manager
              </MenuButton>
              <Link
                href={`/chat/${agent.id}`}
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  borderRadius: 6,
                }}
              >
                Open Chat
              </Link>
              <div style={{ height: 1, background: 'var(--separator)', margin: '4px 0' }} />
              <MenuButton onClick={() => { setMenuOpen(false); onDelete() }} color="var(--system-red)">
                Delete
              </MenuButton>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {agent.description}
      </div>

      {/* Tool Tags */}
      {agent.tools.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {agent.tools.slice(0, 5).map((tool) => (
            <span
              key={tool}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 10,
                background: agent.color + '18',
                color: agent.color,
                fontWeight: 500,
              }}
            >
              {tool}
            </span>
          ))}
          {agent.tools.length > 5 && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 10,
                background: 'var(--fill-quaternary)',
                color: 'var(--text-tertiary)',
              }}
            >
              +{agent.tools.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <Link
        href={`/agents/${agent.id}`}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--accent)',
          textDecoration: 'none',
          marginTop: 'auto',
        }}
      >
        View Profile &rarr;
      </Link>
    </div>
  )
}

function MenuButton({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 12px',
        fontSize: 13,
        color: color || 'var(--text-primary)',
        background: 'none',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: 6,
      }}
    >
      {children}
    </button>
  )
}
