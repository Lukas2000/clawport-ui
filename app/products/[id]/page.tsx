'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product, Agent, Goal, Project, AuditEntry } from '@/lib/types'
import { AgentAvatar } from '@/components/AgentAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ExternalLink, Pencil, Check, X } from 'lucide-react'

// ── Status config ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  planning: 'var(--system-blue)',
  active: 'var(--system-green)',
  paused: 'var(--system-orange)',
  completed: 'var(--system-purple)',
  deprecated: 'var(--text-tertiary)',
}

const GOAL_STATUS_COLORS: Record<string, string> = {
  active: 'var(--system-green)',
  completed: 'var(--system-purple)',
  paused: 'var(--system-orange)',
  cancelled: 'var(--text-tertiary)',
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning: 'var(--system-blue)',
  active: 'var(--system-green)',
  paused: 'var(--system-orange)',
  completed: 'var(--system-purple)',
}

type Tab = 'overview' | 'strategy' | 'goals-projects' | 'docs' | 'history'

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const load = useCallback(async () => {
    const [pRes, agRes, gRes, prRes, auRes] = await Promise.all([
      fetch(`/api/products/${id}`),
      fetch('/api/agents'),
      fetch('/api/goals'),
      fetch('/api/projects'),
      fetch(`/api/audit?entityType=product&entityId=${id}&limit=50`),
    ])
    if (!pRes.ok) { router.push('/products'); return }
    const [p, ag, g, pr, au] = await Promise.all([pRes.json(), agRes.json(), gRes.json(), prRes.json(), auRes.json()])
    setProduct(p)
    if (Array.isArray(ag)) setAgents(ag)
    if (Array.isArray(g)) setGoals(g.filter((x: Goal) => x.productId === id))
    if (Array.isArray(pr)) setProjects(pr.filter((x: Project) => x.productId === id))
    if (au?.entries) setAuditEntries(au.entries)
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function update(data: Record<string, unknown>) {
    if (!product) return
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const res = await fetch(`/api/products/${product.id}`)
    if (res.ok) setProduct(await res.json())
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton style={{ height: 32, width: 200, borderRadius: 8 }} />
        <Skeleton style={{ height: 400, borderRadius: 12 }} />
      </div>
    )
  }

  if (!product) return null

  const owner = agents.find(a => a.id === product.ownerAgentId)
  const statusColor = STATUS_COLORS[product.status] ?? 'var(--text-tertiary)'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div
        style={{
          width: '240px',
          borderRight: '1px solid var(--separator)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Back link */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0 }}>
          <Link
            href="/products"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)', textDecoration: 'none' }}
          >
            <ArrowLeft size={14} />
            Products
          </Link>
        </div>

        {/* Metadata */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {product.name}
            </div>
            {product.currentVersion && (
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>v{product.currentVersion}</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SidebarRow label="Status">
              <select
                value={product.status}
                onChange={(e) => update({ status: e.target.value })}
                style={{ ...sideSelectStyle, color: statusColor }}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </SidebarRow>

            <SidebarRow label="Owner">
              <select
                value={product.ownerAgentId ?? ''}
                onChange={(e) => update({ ownerAgentId: e.target.value || null })}
                style={sideSelectStyle}
              >
                <option value="">No owner</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </SidebarRow>

            {owner && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '0' }}>
                <AgentAvatar agent={owner} size={16} borderRadius={4} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{owner.name}</span>
              </div>
            )}

            <SidebarRow label="Progress">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--fill-quaternary)' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '2px',
                      background: product.progress >= 100 ? '#22C55E' : 'var(--accent)',
                      width: `${product.progress}%`,
                    }}
                  />
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  {product.progress}%
                </span>
              </div>
            </SidebarRow>

            <EditableField label="Version" value={product.currentVersion ?? ''} placeholder="e.g. 1.0.0" onSave={(v) => update({ currentVersion: v || null })} />
            <EditableField label="Launch" value={product.launchDate ?? ''} placeholder="YYYY-MM-DD" onSave={(v) => update({ launchDate: v || null })} />
          </div>

          {/* Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--separator)', paddingTop: '12px' }}>
            <EditableField label="GitHub" value={product.githubUrl ?? ''} placeholder="https://github.com/..." onSave={(v) => update({ githubUrl: v || null })} />
            <EditableField label="API Docs" value={product.apiDocsUrl ?? ''} placeholder="https://docs.example.com" onSave={(v) => update({ apiDocsUrl: v || null })} />
            {product.githubUrl && (
              <a href={product.githubUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>
                <ExternalLink size={11} /> GitHub
              </a>
            )}
            {product.apiDocsUrl && (
              <a href={product.apiDocsUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}>
                <ExternalLink size={11} /> API Docs
              </a>
            )}
          </div>
        </div>

        {/* Delete */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--separator)', flexShrink: 0 }}>
          <button
            onClick={async () => {
              if (!confirm('Delete this product? All linked goals and projects will be unlinked.')) return
              await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
              router.push('/products')
            }}
            style={{
              width: '100%',
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
            Delete Product
          </button>
        </div>
      </div>

      {/* Right area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: '1px solid var(--separator)',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          {([
            ['overview', 'Overview'],
            ['strategy', 'Strategy'],
            ['goals-projects', 'Goals & Projects'],
            ['docs', 'Docs'],
            ['history', 'History'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: activeTab === key ? 600 : 400,
                color: activeTab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'color 100ms',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeTab === 'overview' && (
            <OverviewTab product={product} goals={goals} projects={projects} onUpdate={update} />
          )}
          {activeTab === 'strategy' && (
            <StrategyTab product={product} onUpdate={update} />
          )}
          {activeTab === 'goals-projects' && (
            <GoalsProjectsTab product={product} goals={goals} projects={projects} agents={agents} />
          )}
          {activeTab === 'docs' && (
            <DocsTab product={product} onUpdate={update} />
          )}
          {activeTab === 'history' && (
            <HistoryTab entries={auditEntries} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  product,
  goals,
  projects,
  onUpdate,
}: {
  product: Product
  goals: Goal[]
  projects: Project[]
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const completedGoals = goals.filter(g => g.status === 'completed').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const completionPct = (goals.length + projects.length) > 0
    ? Math.round(((completedGoals + completedProjects) / (goals.length + projects.length)) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <StatCard label="Goals" value={goals.length} />
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Completion" value={`${completionPct}%`} />
      </div>

      {/* Purpose */}
      <EditableSection
        label="Purpose"
        value={product.purpose}
        placeholder="Describe the mission-aligned purpose of this product..."
        onSave={(v) => onUpdate({ purpose: v })}
      />

      {/* Value Proposition */}
      <EditableSection
        label="Value Proposition"
        value={product.valueProposition}
        placeholder="What core value does this product deliver to users?"
        onSave={(v) => onUpdate({ valueProposition: v })}
      />

      {/* Target Audience */}
      <EditableSection
        label="Target Audience"
        value={product.targetAudience}
        placeholder="Who is this product built for?"
        onSave={(v) => onUpdate({ targetAudience: v })}
      />
    </div>
  )
}

// ── Strategy Tab ──────────────────────────────────────────────────────────────

function StrategyTab({ product, onUpdate }: { product: Product; onUpdate: (data: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      <EditableSection
        label="Business Goals"
        value={product.businessGoals}
        placeholder="What are the high-level business objectives for this product? (supports markdown)"
        multiline
        onSave={(v) => onUpdate({ businessGoals: v })}
      />
      <EditableSection
        label="Monetization"
        value={product.monetization}
        placeholder="Describe the revenue model, pricing strategy, and key revenue streams. (supports markdown)"
        multiline
        onSave={(v) => onUpdate({ monetization: v })}
      />
      <EditableSection
        label="Go-to-Market Strategy"
        value={product.goToMarket}
        placeholder="How will this product reach its target audience? What is the launch plan? (supports markdown)"
        multiline
        onSave={(v) => onUpdate({ goToMarket: v })}
      />
      <EditableSection
        label="Marketing Methods"
        value={product.marketingMethods}
        placeholder="Current marketing channels, campaigns, and methods in use."
        multiline
        onSave={(v) => onUpdate({ marketingMethods: v })}
      />
      <EditableSection
        label="Key Differentiators"
        value={product.keyDifferentiators}
        placeholder="What makes this product stand out from competitors? What is the competitive advantage?"
        multiline
        onSave={(v) => onUpdate({ keyDifferentiators: v })}
      />
    </div>
  )
}

// ── Goals & Projects Tab ──────────────────────────────────────────────────────

function GoalsProjectsTab({
  product,
  goals,
  projects,
  agents,
}: {
  product: Product
  goals: Goal[]
  projects: Project[]
  agents: Agent[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '720px' }}>
      {/* Goals */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Goals ({goals.length})
          </h3>
          <Link
            href={`/goals`}
            style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}
          >
            Manage goals →
          </Link>
        </div>
        {goals.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
            No goals linked to this product yet. Go to Goals and set the product on a goal.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {goals.map(g => {
              const statusColor = GOAL_STATUS_COLORS[g.status] ?? 'var(--text-tertiary)'
              const owner = agents.find(a => a.id === g.ownerAgentId)
              return (
                <div
                  key={g.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--material-regular)',
                    border: '1px solid var(--separator)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{g.title}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', background: statusColor + '18', color: statusColor, textTransform: 'capitalize' }}>
                        {g.status}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-quaternary)' }}>{g.type}</span>
                    </div>
                    <div style={{ height: '3px', borderRadius: '2px', background: 'var(--fill-quaternary)' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: g.progress >= 100 ? '#22C55E' : 'var(--accent)', width: `${g.progress}%` }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>{g.progress}%</span>
                  {owner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <AgentAvatar agent={owner} size={14} borderRadius={3} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{owner.name}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Projects */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Projects ({projects.length})
          </h3>
          <Link
            href={`/projects`}
            style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}
          >
            Manage projects →
          </Link>
        </div>
        {projects.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
            No projects linked to this product yet. Go to Projects and set the product on a project.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.map(p => {
              const statusColor = PROJECT_STATUS_COLORS[p.status] ?? 'var(--text-tertiary)'
              const pm = agents.find(a => a.id === p.leadAgentId)
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--material-regular)',
                    border: '1px solid var(--separator)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', background: statusColor + '18', color: statusColor, textTransform: 'capitalize' }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ height: '3px', borderRadius: '2px', background: 'var(--fill-quaternary)' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: p.progress >= 100 ? '#22C55E' : 'var(--accent)', width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>{p.progress}%</span>
                  {pm ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <AgentAvatar agent={pm} size={14} borderRadius={3} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pm.name}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-quaternary)', flexShrink: 0 }}>No PM</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Docs Tab ──────────────────────────────────────────────────────────────────

function DocsTab({ product, onUpdate }: { product: Product; onUpdate: (data: Record<string, unknown>) => void }) {
  const [editingDocs, setEditingDocs] = useState(false)
  const [docsValue, setDocsValue] = useState(product.documentation)

  async function saveDocs() {
    await onUpdate({ documentation: docsValue })
    setEditingDocs(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
      {/* Links */}
      {(product.githubUrl || product.apiDocsUrl) && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {product.githubUrl && (
            <a
              href={product.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'var(--fill-quaternary)',
                border: '1px solid var(--separator)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} />
              GitHub Repository
            </a>
          )}
          {product.apiDocsUrl && (
            <a
              href={product.apiDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'var(--fill-quaternary)',
                border: '1px solid var(--separator)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} />
              API Documentation
            </a>
          )}
        </div>
      )}

      {/* Tech Stack */}
      <EditableSection
        label="Tech Stack"
        value={product.techStack}
        placeholder="Overview of the technical stack used in this product."
        onSave={(v) => onUpdate({ techStack: v })}
      />

      {/* Documentation */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Documentation</span>
          {editingDocs ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={saveDocs} style={iconBtn}>
                <Check size={14} />
              </button>
              <button onClick={() => { setDocsValue(product.documentation); setEditingDocs(false) }} style={iconBtn}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingDocs(true)} style={iconBtn}>
              <Pencil size={14} />
            </button>
          )}
        </div>
        {editingDocs ? (
          <textarea
            value={docsValue}
            onChange={(e) => setDocsValue(e.target.value)}
            placeholder="Full product documentation in Markdown..."
            style={{
              width: '100%',
              minHeight: '400px',
              padding: '12px',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              background: 'var(--fill-quaternary)',
              border: '1px solid var(--separator)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              resize: 'vertical',
              lineHeight: 1.6,
            }}
          />
        ) : product.documentation ? (
          <div
            className="prose-content"
            style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
              lineHeight: 1.7,
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(product.documentation) }}
          />
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
            No documentation yet. Click the edit button to add documentation in Markdown.
          </p>
        )}
      </div>
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No history recorded yet.</p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '720px' }}>
      {entries.map(entry => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'var(--material-regular)',
            border: '1px solid var(--separator)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{entry.action}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-quaternary)' }}>by {entry.actorType}{entry.actorId ? ` (${entry.actorId})` : ''}</span>
            </div>
            {Object.keys(entry.details).length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {JSON.stringify(entry.details)}
              </div>
            )}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-quaternary)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
            {new Date(entry.timestamp).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Reusable components ───────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '10px',
        background: 'var(--material-regular)',
        border: '1px solid var(--separator)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function EditableSection({
  label,
  value,
  placeholder,
  multiline = false,
  onSave,
}: {
  label: string
  value: string
  placeholder: string
  multiline?: boolean
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  // Sync draft when value changes externally
  useEffect(() => { setDraft(value) }, [value])

  function save() {
    onSave(draft)
    setEditing(false)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        {editing ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={save} style={iconBtn}><Check size={14} /></button>
            <button onClick={cancel} style={iconBtn}><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={14} /></button>
        )}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '10px 12px',
              fontSize: '13px',
              background: 'var(--fill-quaternary)',
              border: '1px solid var(--separator)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              resize: 'vertical',
              lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              background: 'var(--fill-quaternary)',
              border: '1px solid var(--separator)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
        )
      ) : value ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{value}</p>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--text-quaternary)', margin: 0, fontStyle: 'italic' }}>{placeholder}</p>
      )}
    </div>
  )
}

function EditableField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string
  value: string
  placeholder: string
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-quaternary)', marginBottom: '2px' }}>{label}</div>
      {editing ? (
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '3px 6px',
              fontSize: '11px',
              background: 'var(--fill-quaternary)',
              border: '1px solid var(--separator)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
            }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { onSave(draft); setEditing(false) } if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
          />
          <button onClick={() => { onSave(draft); setEditing(false) }} style={{ ...iconBtn, padding: '2px 4px' }}><Check size={12} /></button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <span style={{ fontSize: '11px', color: value ? 'var(--text-secondary)' : 'var(--text-quaternary)' }}>
            {value || placeholder}
          </span>
          <Pencil size={10} style={{ color: 'var(--text-quaternary)', flexShrink: 0 }} />
        </button>
      )}
    </div>
  )
}

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-quaternary)' }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderMarkdownSafe(text: string): string {
  // Simple safe markdown render - escape HTML then convert basic markdown
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:16px 0 6px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;margin:20px 0 8px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:17px;font-weight:700;margin:24px 0 10px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family:var(--font-mono);font-size:0.9em;background:var(--fill-tertiary);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:8px 0">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/^(?!<[h|u|l|p])(.+)$/gm, '<p style="margin:8px 0">$1</p>')
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sideSelectStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: '4px',
  padding: '1px 2px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  outline: 'none',
  maxWidth: '100%',
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-tertiary)',
  padding: '4px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
}
