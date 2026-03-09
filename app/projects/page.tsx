'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Project, Agent } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  planning: 'var(--system-blue)',
  active: 'var(--system-green)',
  paused: 'var(--system-orange)',
  completed: 'var(--system-purple)',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--system-green)',
  medium: 'var(--system-orange)',
  high: 'var(--system-red)',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {})
    fetch('/api/agents').then((r) => r.json()).then((d: unknown) => { if (Array.isArray(d)) setAgents(d) }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  function agentFor(id: string | null) {
    return agents.find((a) => a.id === id)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Projects
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          + New Project
        </button>
      </div>

      {showCreate && (
        <CreateProjectForm
          agents={agents}
          onCreated={() => { setShowCreate(false); load() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} agent={agentFor(p.leadAgentId)} onUpdate={load} />
        ))}
      </div>

      {projects.length === 0 && !showCreate && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
          No projects yet. Create one to get started.
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, agent, onUpdate }: { project: Project; agent?: Agent; onUpdate: () => void }) {
  const statusColor = STATUS_COLORS[project.status] ?? 'var(--text-tertiary)'
  const priorityColor = PRIORITY_COLORS[project.priority] ?? 'var(--text-tertiary)'

  async function deleteProject() {
    if (!confirm('Delete this project?')) return
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    onUpdate()
  }

  return (
    <div
      style={{
        background: 'var(--material-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {project.name}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ ...badgeStyle, background: statusColor + '18', color: statusColor }}>
            {project.status}
          </span>
          <span style={{ ...badgeStyle, background: priorityColor + '18', color: priorityColor }}>
            {project.priority}
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '39px',
        }}
      >
        {project.description || 'No description'}
      </div>

      {/* Progress Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--fill-quaternary)' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '2px',
              background: 'var(--accent)',
              width: `${project.progress}%`,
              transition: 'width 300ms',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        {agent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px' }}>{agent.emoji}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{agent.name}</span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>No lead</span>
        )}
        <button onClick={deleteProject} style={{ fontSize: '11px', color: 'var(--text-quaternary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Delete
        </button>
      </div>
    </div>
  )
}

function CreateProjectForm({ agents, onCreated, onCancel }: { agents: Agent[]; onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [leadAgentId, setLeadAgentId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description,
          priority,
          leadAgentId: leadAgentId || null,
        }),
      })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--material-regular)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" style={inputStyle} autoFocus />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: '12px' }}>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <select value={leadAgentId} onChange={(e) => setLeadAgentId(e.target.value)} style={inputStyle}>
          <option value="">No lead agent</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={saving || !name.trim()} style={btnPrimary}>Create</button>
        <button type="button" onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </form>
  )
}

const badgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '10px',
  textTransform: 'capitalize',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  background: 'var(--fill-quaternary)',
  border: '1px solid var(--separator)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  background: 'var(--fill-quaternary)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--separator)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
}
