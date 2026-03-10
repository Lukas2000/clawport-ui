'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Product, Agent } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AgentAvatar } from '@/components/AgentAvatar'
import { Layers, X, ExternalLink } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  planning: 'var(--system-blue)',
  active: 'var(--system-green)',
  paused: 'var(--system-orange)',
  completed: 'var(--system-purple)',
  deprecated: 'var(--text-tertiary)',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setProducts(d) }).catch(() => {}),
      fetch('/api/agents').then((r) => r.json()).then((d) => { if (Array.isArray(d)) setAgents(d) }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUpdate(productId: string, data: Record<string, unknown>) {
    await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    load()
    if (selected?.id === productId) {
      const res = await fetch(`/api/products/${productId}`)
      if (res.ok) setSelected(await res.json())
    }
  }

  function agentFor(id: string | null) {
    return agents.find((a) => a.id === id)
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
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Products</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ New Product</button>
      </div>

      {/* Content + sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {showCreate && (
            <CreateProductForm
              agents={agents}
              onCreated={() => { setShowCreate(false); load() }}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
            ))
          ) : products.length === 0 && !showCreate ? (
            <EmptyState
              icon={Layers}
              title="No products yet"
              description="Define your products to organize goals and projects under a clear product strategy."
              action={{ label: 'Create Product', onClick: () => setShowCreate(true) }}
            />
          ) : (
            products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                agent={agentFor(p.ownerAgentId)}
                selected={selected?.id === p.id}
                onSelect={() => setSelected(selected?.id === p.id ? null : p)}
                onDelete={async () => {
                  await fetch(`/api/products/${p.id}`, { method: 'DELETE' })
                  if (selected?.id === p.id) setSelected(null)
                  load()
                }}
              />
            ))
          )}
        </div>

        {/* Product detail sidebar */}
        {selected && (
          <ProductSidebar
            product={selected}
            agents={agents}
            onClose={() => setSelected(null)}
            onUpdate={(data) => handleUpdate(selected.id, data)}
            onDelete={async () => {
              await fetch(`/api/products/${selected.id}`, { method: 'DELETE' })
              setSelected(null)
              load()
            }}
          />
        )}
      </div>
    </div>
  )
}

function ProductRow({
  product,
  agent,
  selected,
  onSelect,
  onDelete,
}: {
  product: Product
  agent?: Agent
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const statusColor = STATUS_COLORS[product.status] ?? 'var(--text-tertiary)'

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 16px',
        borderRadius: 'var(--radius-lg)',
        background: selected ? 'var(--material-thick)' : 'var(--material-regular)',
        border: selected ? '1px solid var(--accent)' : '1px solid transparent',
        cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
    >
      {/* Name + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {product.name}
          </span>
          <span style={{ ...badgeStyle, background: statusColor + '18', color: statusColor }}>
            {product.status}
          </span>
        </div>
        {product.description && (
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {product.description}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ width: '120px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-quaternary)', marginBottom: '3px' }}>
          <span>Progress</span>
          <span>{product.progress}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--fill-quaternary)' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '2px',
              background: product.progress >= 100 ? '#22C55E' : 'var(--accent)',
              width: `${product.progress}%`,
              transition: 'width 300ms',
            }}
          />
        </div>
      </div>

      {/* Owner */}
      <div style={{ width: '120px', flexShrink: 0 }}>
        {agent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AgentAvatar agent={agent} size={16} borderRadius={4} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{agent.name}</span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>No owner</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/products/${product.id}`}
          style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none' }}
        >
          Open
        </Link>
        <button
          onClick={() => { if (confirm('Delete this product?')) onDelete() }}
          style={{ fontSize: '11px', color: 'var(--text-quaternary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function ProductSidebar({
  product,
  agents,
  onClose,
  onUpdate,
  onDelete,
}: {
  product: Product
  agents: Agent[]
  onClose: () => void
  onUpdate: (data: Record<string, unknown>) => void
  onDelete: () => void
}) {
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
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <DetailRow label="Status">
            <select
              value={product.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              style={inlineSelectStyle}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </DetailRow>

          <DetailRow label="Owner">
            <select
              value={product.ownerAgentId ?? ''}
              onChange={(e) => onUpdate({ ownerAgentId: e.target.value || null })}
              style={inlineSelectStyle}
            >
              <option value="">No owner</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </DetailRow>

          <DetailRow label="Progress">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--fill-quaternary)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${product.progress}%`,
                    height: '100%',
                    borderRadius: '3px',
                    background: product.progress >= 100 ? '#22C55E' : 'var(--accent)',
                    transition: 'width 300ms',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {product.progress}%
              </span>
            </div>
          </DetailRow>
        </div>

        {/* Purpose */}
        {product.purpose && (
          <div style={{ borderTop: '1px solid var(--separator)', paddingTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: '4px' }}>Purpose</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {product.purpose}
            </p>
          </div>
        )}

        {/* Links */}
        {(product.githubUrl || product.apiDocsUrl) && (
          <div style={{ borderTop: '1px solid var(--separator)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {product.githubUrl && (
              <a
                href={product.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}
              >
                <ExternalLink size={12} />
                GitHub Repository
              </a>
            )}
            {product.apiDocsUrl && (
              <a
                href={product.apiDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}
              >
                <ExternalLink size={12} />
                API Documentation
              </a>
            )}
          </div>
        )}

        {/* Full page link */}
        <div style={{ borderTop: '1px solid var(--separator)', paddingTop: '12px' }}>
          <Link
            href={`/products/${product.id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}
          >
            View full product page →
          </Link>
        </div>

        {/* Delete */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--separator)' }}>
          <button
            onClick={() => { if (confirm('Delete this product? This will unlink all goals and projects.')) onDelete() }}
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
            Delete Product
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateProductForm({
  agents,
  onCreated,
  onCancel,
}: {
  agents: Agent[]
  onCreated: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [purpose, setPurpose] = useState('')
  const [status, setStatus] = useState('planning')
  const [ownerAgentId, setOwnerAgentId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description,
          purpose,
          status,
          ownerAgentId: ownerAgentId || null,
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
        marginBottom: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" style={inputStyle} autoFocus />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" style={inputStyle} />
      <textarea
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="Purpose — what problem does this product solve?"
        style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Owner</label>
          <select value={ownerAgentId} onChange={(e) => setOwnerAgentId(e.target.value)} style={inputStyle}>
            <option value="">No owner</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={saving || !name.trim()} style={btnPrimary}>Create Product</button>
        <button type="button" onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </form>
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
