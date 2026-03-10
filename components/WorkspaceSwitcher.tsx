'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, Plus, Trash2, Building2 } from 'lucide-react'
import type { WorkspaceProfile } from '@/lib/types'

interface WorkspaceData {
  profiles: WorkspaceProfile[]
  currentPath: string | null
}

export function WorkspaceSwitcher() {
  const [data, setData] = useState<WorkspaceData>({ profiles: [], currentPath: null })
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')

  const load = useCallback(() => {
    fetch('/api/workspaces')
      .then(r => r.ok ? r.json() : { profiles: [], currentPath: null })
      .then((d: WorkspaceData) => setData(d))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const currentProfile = data.profiles.find(p => p.path === data.currentPath)
  const displayName = currentProfile?.name ?? 'Local Workspace'

  async function addWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newPath.trim()) return
    await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), path: newPath.trim() }),
    })
    setNewName('')
    setNewPath('')
    setShowAdd(false)
    load()
  }

  async function removeWorkspace(id: string) {
    await fetch('/api/workspaces', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '6px 8px',
          border: 'none',
          borderRadius: '8px',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Building2 size={14} style={{ color: '#fff' }} />
        </div>
        <span
          style={{
            flex: 1,
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: 'var(--text-tertiary)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => { setOpen(false); setShowAdd(false) }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              zIndex: 100,
              background: 'var(--material-elevated, var(--material-regular))',
              border: '1px solid var(--separator)',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              minWidth: '200px',
            }}
          >
            {/* Current workspace indicator */}
            {data.currentPath && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--separator)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Current
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.currentPath}
                </div>
              </div>
            )}

            {/* Workspace list */}
            {data.profiles.length > 0 && (
              <div style={{ padding: '4px 0' }}>
                {data.profiles.map(p => {
                  const isCurrent = p.path === data.currentPath
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: isCurrent ? 'var(--accent-fill)' : 'transparent',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '5px',
                          background: isCurrent ? 'var(--accent)' : 'var(--fill-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={10} style={{ color: isCurrent ? '#fff' : 'var(--text-tertiary)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: isCurrent ? 600 : 500,
                          color: isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {p.name}
                        </div>
                      </div>
                      {!isCurrent && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeWorkspace(p.id) }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            color: 'var(--text-quaternary)',
                            flexShrink: 0,
                            borderRadius: '4px',
                          }}
                          title="Remove workspace"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add workspace */}
            <div style={{ borderTop: '1px solid var(--separator)' }}>
              {showAdd ? (
                <form onSubmit={addWorkspace} style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Workspace name"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '11px',
                      border: '1px solid var(--separator)',
                      borderRadius: '5px',
                      background: 'var(--fill-quaternary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <input
                    value={newPath}
                    onChange={e => setNewPath(e.target.value)}
                    placeholder="Workspace path"
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '11px',
                      border: '1px solid var(--separator)',
                      borderRadius: '5px',
                      background: 'var(--fill-quaternary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="submit"
                      disabled={!newName.trim() || !newPath.trim()}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '5px',
                        background: 'var(--accent)',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdd(false)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        border: '1px solid var(--separator)',
                        borderRadius: '5px',
                        background: 'var(--fill-quaternary)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAdd(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Plus size={12} />
                  Add Workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
