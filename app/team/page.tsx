'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Agent } from '@/lib/types'
import type { MissionData } from '@/lib/types'

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

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [mission, setMission] = useState<MissionData | null>(null)

  useEffect(() => {
    fetch('/api/agents').then((r) => r.json()).then(setAgents).catch(() => {})
    fetch('/api/mission').then((r) => r.json()).then(setMission).catch(() => {})
  }, [])

  const groups = buildTeamGroups(agents)

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      {/* Mission Banner */}
      {mission && (
        <div
          style={{
            background: 'var(--material-thick)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 32px',
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '18px',
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
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Meet the Team
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''} across {groups.length} team{groups.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Team Sections */}
      {groups.map((group, gi) => (
        <div key={`${group.label}-${gi}`} style={{ marginBottom: '32px' }}>
          {gi > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 16px' }}>
              <div style={{ height: '1px', flex: 1, background: 'var(--separator)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-quaternary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                &#9660;
              </span>
              <div style={{ height: '1px', flex: 1, background: 'var(--separator)' }} />
            </div>
          )}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: '12px',
            }}
          >
            {group.label}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {group.agents.map((agent) => (
              <TeamCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TeamCard({ agent }: { agent: Agent }) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: agent.color + '22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
          }}
        >
          {agent.emoji}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {agent.title}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {agent.description}
      </div>

      {/* Skill Tags */}
      {agent.tools.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {agent.tools.slice(0, 5).map((tool) => (
            <span
              key={tool}
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '10px',
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
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'var(--fill-quaternary)',
                color: 'var(--text-tertiary)',
              }}
            >
              +{agent.tools.length - 5}
            </span>
          )}
        </div>
      )}

      <Link
        href={`/agents/${agent.id}`}
        style={{
          fontSize: '12px',
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
