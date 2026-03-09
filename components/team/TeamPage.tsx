'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Agent, MissionData } from '@/lib/types'
import { TeamCard } from './TeamCard'
import { AddAgentModal } from './AddAgentModal'
import { EditAgentModal } from './EditAgentModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { ManagerPicker } from './ManagerPicker'

// ---------------------------------------------------------------------------
// Team grouping (same logic as before, now in this component)
// ---------------------------------------------------------------------------

interface TeamGroup {
  label: string
  agents: Agent[]
}

function buildTeamGroups(agents: Agent[]): TeamGroup[] {
  const root = agents.find((a) => !a.reportsTo)
  if (!root) return [{ label: 'Team', agents }]

  const groups: TeamGroup[] = []
  groups.push({ label: 'Executive', agents: [root] })

  const directReports = agents.filter((a) => a.reportsTo === root.id)
  const managers = directReports.filter((a) => a.directReports.length > 0)
  const soloOps = directReports.filter((a) => a.directReports.length === 0)

  for (const mgr of managers) {
    const members = agents.filter((a) => a.reportsTo === mgr.id)
    const label = inferTeamLabel(mgr)
    groups.push({ label, agents: [mgr, ...members] })
  }

  if (soloOps.length > 0) {
    groups.push({ label: 'Operations', agents: soloOps })
  }

  // Agents that don't fit into any group (orphaned — reportsTo a non-root, non-manager)
  const assignedIds = new Set(groups.flatMap((g) => g.agents.map((a) => a.id)))
  const unassigned = agents.filter((a) => !assignedIds.has(a.id))
  if (unassigned.length > 0) {
    groups.push({ label: 'Other', agents: unassigned })
  }

  return groups
}

function inferTeamLabel(manager: Agent): string {
  const t = manager.title.toLowerCase()
  if (t.includes('product')) return 'Product'
  if (t.includes('engineer') || t.includes('cto') || t.includes('tech')) return 'Engineering'
  if (t.includes('growth') || t.includes('market') || t.includes('seo')) return 'Growth'
  if (t.includes('operation') || t.includes('ops')) return 'Operations'
  if (t.includes('design') || t.includes('ux')) return 'Design'
  return manager.name + "'s Team"
}

// ---------------------------------------------------------------------------
// TeamPage
// ---------------------------------------------------------------------------

export function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [mission, setMission] = useState<MissionData | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null)
  const [reassignAgent, setReassignAgent] = useState<Agent | null>(null)
  const [search, setSearch] = useState('')

  const refresh = useCallback(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then(setAgents)
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    fetch('/api/mission')
      .then((r) => r.json())
      .then(setMission)
      .catch(() => {})
  }, [refresh])

  const filteredAgents = search
    ? agents.filter((a) => {
        const q = search.toLowerCase()
        return (
          a.name.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
        )
      })
    : agents

  const groups = buildTeamGroups(filteredAgents)

  async function handleDelete() {
    if (!deleteAgent) return
    try {
      await fetch(`/api/agents/${deleteAgent.id}`, { method: 'DELETE' })
      setDeleteAgent(null)
      refresh()
    } catch {
      // handle silently
    }
  }

  async function handleReassign(newManagerId: string | null) {
    if (!reassignAgent) return
    try {
      await fetch(`/api/agents/${reassignAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsTo: newManagerId }),
      })
      setReassignAgent(null)
      refresh()
    } catch {
      // handle silently
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      {/* Mission Banner */}
      {mission && (
        <div
          style={{
            background: 'var(--material-thick)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 32px',
            marginBottom: 32,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            &ldquo;{mission.mission}&rdquo;
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Team Management
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} across {buildTeamGroups(agents).length} team{buildTeamGroups(agents).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          + Add Agent
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 360,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--separator)',
            background: 'var(--fill-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Team Sections */}
      {groups.map((group, gi) => (
        <div key={`${group.label}-${gi}`} style={{ marginBottom: 32 }}>
          {gi > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--separator)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-quaternary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                &#9660;
              </span>
              <div style={{ height: 1, flex: 1, background: 'var(--separator)' }} />
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: 12,
            }}
          >
            {group.label}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {group.agents.map((agent) => (
              <TeamCard
                key={agent.id}
                agent={agent}
                onEdit={() => setEditAgent(agent)}
                onDelete={() => setDeleteAgent(agent)}
                onChangeManager={() => setReassignAgent(agent)}
              />
            ))}
          </div>
        </div>
      ))}

      {agents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            No agents yet
          </div>
          <div style={{ fontSize: 14 }}>
            Add your first agent to get started.
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddAgentModal
          agents={agents}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            refresh()
          }}
        />
      )}

      {editAgent && (
        <EditAgentModal
          agent={editAgent}
          allAgents={agents}
          onClose={() => setEditAgent(null)}
          onSaved={() => {
            setEditAgent(null)
            refresh()
          }}
        />
      )}

      {deleteAgent && (
        <DeleteConfirmModal
          agent={deleteAgent}
          onCancel={() => setDeleteAgent(null)}
          onConfirm={handleDelete}
        />
      )}

      {reassignAgent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setReassignAgent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--material-thick)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              maxWidth: 420,
              width: '90%',
              boxShadow: 'var(--shadow-modal)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Change Manager for {reassignAgent.name}
            </h3>
            <ManagerPicker
              agents={agents}
              value={reassignAgent.reportsTo}
              onChange={handleReassign}
              excludeId={reassignAgent.id}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setReassignAgent(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
