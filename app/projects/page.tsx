'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Project, Agent, Goal, Product } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AgentAvatar } from '@/components/AgentAvatar'
import { FolderKanban, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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
  const [goals, setGoals] = useState<Goal[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {}),
      fetch('/api/agents').then((r) => r.json()).then((d: unknown) => { if (Array.isArray(d)) setAgents(d) }).catch(() => {}),
      fetch('/api/goals').then((r) => r.json()).then((d: unknown) => { if (Array.isArray(d)) setGoals(d) }).catch(() => {}),
      fetch('/api/products').then((r) => r.json()).then((d: unknown) => { if (Array.isArray(d)) setProducts(d) }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function agentFor(id: string | null) {
    return agents.find((a) => a.id === id)
  }

  function goalFor(id: string | null) {
    return goals.find((g) => g.id === id)
  }

  function productFor(id: string | null) {
    return products.find((p) => p.id === id)
  }

  async function handleUpdate(projectId: string, data: Record<string, unknown>) {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    load()
    if (selectedProject?.id === projectId) {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) setSelectedProject(await res.json())
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Projects</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ New Project</button>
      </div>

      {/* Content + sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {showCreate && (
            <CreateProjectForm
              agents={agents}
              goals={goals}
              products={products}
              onCreated={() => { setShowCreate(false); load() }}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : projects.length === 0 && !showCreate ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project under a goal and assign a project manager to execute it."
              action={{ label: 'Create Project', onClick: () => setShowCreate(true) }}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  agent={agentFor(p.leadAgentId)}
                  goal={goalFor(p.goalId)}
                  product={productFor(p.productId)}
                  selected={selectedProject?.id === p.id}
                  onSelect={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}
                  onUpdate={load}
                />
              ))}
            </div>
          )}
        </div>

        {/* Project detail sidebar */}
        {selectedProject && (
          <ProjectDetail
            project={selectedProject}
            agents={agents}
            goals={goals}
            products={products}
            onClose={() => setSelectedProject(null)}
            onUpdate={(data) => handleUpdate(selectedProject.id, data)}
            onDelete={async () => {
              await fetch(`/api/projects/${selectedProject.id}`, { method: 'DELETE' })
              setSelectedProject(null)
              load()
            }}
          />
        )}
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  agent,
  goal,
  product,
  selected,
  onSelect,
  onUpdate,
}: {
  project: Project
  agent?: Agent
  goal?: Goal
  product?: Product
  selected: boolean
  onSelect: () => void
  onUpdate: () => void
}) {
  const statusColor = STATUS_COLORS[project.status] ?? 'var(--text-tertiary)'
  const priorityColor = PRIORITY_COLORS[project.priority] ?? 'var(--text-tertiary)'

  async function deleteProject(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    onUpdate()
  }

  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? 'var(--material-thick)' : 'var(--material-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        border: selected ? '1px solid var(--accent)' : '1px solid transparent',
        transition: 'border-color 150ms',
      }}
    >
      {/* Product + Goal breadcrumb */}
      {(product || goal) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {product && (
            <>
              <span style={{ fontSize: '11px', color: 'var(--text-quaternary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {product.name}
              </span>
              {goal && <ChevronRight size={10} style={{ color: 'var(--text-quaternary)' }} />}
            </>
          )}
          {goal && (
            <span style={{ fontSize: '11px', color: 'var(--text-quaternary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {goal.title}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {project.name}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
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

      {/* Progress */}
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
              background: project.progress >= 100 ? '#22C55E' : 'var(--accent)',
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
            <AgentAvatar agent={agent} size={16} borderRadius={4} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{agent.name}</span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>No PM assigned</span>
        )}
        <button
          onClick={deleteProject}
          style={{ fontSize: '11px', color: 'var(--text-quaternary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ProjectDetail({
  project,
  agents,
  goals,
  products,
  onClose,
  onUpdate,
  onDelete,
}: {
  project: Project
  agents: Agent[]
  goals: Goal[]
  products: Product[]
  onClose: () => void
  onUpdate: (data: Record<string, unknown>) => void
  onDelete: () => void
}) {
  const goal = goals.find(g => g.id === project.goalId)
  const agent = agents.find(a => a.id === project.leadAgentId)

  return (
    <div
      style={{
        width: '360px',
        borderLeft: '1px solid var(--separator)',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}
      >
        {/* Breadcrumb: goal → project */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          {goal && (
            <>
              <Link
                href="/goals"
                style={{ fontSize: '11px', color: 'var(--text-quaternary)', whiteSpace: 'nowrap', textDecoration: 'none' }}
              >
                {goal.title}
              </Link>
              <ChevronRight size={10} style={{ color: 'var(--text-quaternary)', flexShrink: 0 }} />
            </>
          )}
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            {project.name}
          </h2>
          {project.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
              {project.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--separator)', paddingTop: '12px' }}>
          {/* Status */}
          <DetailRow label="Status">
            <select
              value={project.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              style={inlineSelectStyle}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </DetailRow>

          {/* Priority */}
          <DetailRow label="Priority">
            <select
              value={project.priority}
              onChange={(e) => onUpdate({ priority: e.target.value })}
              style={inlineSelectStyle}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </DetailRow>

          {/* PM Agent */}
          <DetailRow label="PM Agent">
            <select
              value={project.leadAgentId ?? ''}
              onChange={(e) => onUpdate({ leadAgentId: e.target.value || null })}
              style={inlineSelectStyle}
            >
              <option value="">Unassigned</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
              ))}
            </select>
          </DetailRow>

          {/* Goal */}
          <DetailRow label="Goal">
            <select
              value={project.goalId ?? ''}
              onChange={(e) => onUpdate({ goalId: e.target.value || null })}
              style={inlineSelectStyle}
            >
              <option value="">No goal</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </DetailRow>

          {/* Product */}
          <DetailRow label="Product">
            <select
              value={project.productId ?? ''}
              onChange={(e) => onUpdate({ productId: e.target.value || null })}
              style={inlineSelectStyle}
            >
              <option value="">No product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </DetailRow>

          {/* Progress */}
          <DetailRow label="Progress">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--fill-quaternary)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${project.progress}%`,
                    height: '100%',
                    borderRadius: '3px',
                    background: project.progress >= 100 ? '#22C55E' : 'var(--accent)',
                    transition: 'width 300ms',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {project.progress}%
              </span>
            </div>
          </DetailRow>
        </div>

        {/* View issues link */}
        <div style={{ paddingTop: '4px' }}>
          <Link
            href={`/issues?project_id=${project.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--accent)',
              textDecoration: 'none',
              padding: '4px 0',
            }}
          >
            View issues for this project →
          </Link>
        </div>

        {/* Delete */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--separator)' }}>
          <button
            onClick={() => { if (confirm('Delete this project?')) onDelete() }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,69,58,0.3)',
              background: 'rgba(255,69,58,0.08)',
              color: 'var(--system-red)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', width: '72px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function CreateProjectForm({
  agents,
  goals,
  products,
  onCreated,
  onCancel,
}: {
  agents: Agent[]
  goals: Goal[]
  products: Product[]
  onCreated: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [leadAgentId, setLeadAgentId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [productId, setProductId] = useState('')
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
          goalId: goalId || null,
          productId: productId || null,
        }),
      })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: 'var(--material-regular)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" style={inputStyle} autoFocus />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={inputStyle}>
            <option value="">No product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Goal</label>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} style={inputStyle}>
            <option value="">No goal</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Project Manager (Agent)</label>
          <select value={leadAgentId} onChange={(e) => setLeadAgentId(e.target.value)} style={inputStyle}>
            <option value="">No PM assigned</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
          </select>
        </div>
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

const inlineSelectStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: '4px',
  padding: '2px 4px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  outline: 'none',
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
