'use client'

import { useEffect, useState } from 'react'
import type { CronJob, Agent } from '@/lib/types'
import { buildCalendarWeek, type CalendarSlot } from '@/lib/calendar'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function CalendarPage() {
  const [crons, setCrons] = useState<CronJob[]>([])
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    fetch('/api/crons')
      .then((r) => r.json())
      .then((d: unknown) => {
        const list: CronJob[] = Array.isArray(d) ? d : (d as { crons?: CronJob[] })?.crons ?? []
        setCrons(list)
      })
      .catch(() => {})
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setAgents(d) })
      .catch(() => {})
  }, [])

  const colorMap: Record<string, string> = {}
  for (const a of agents) colorMap[a.id] = a.color

  const { slots, alwaysRunning } = buildCalendarWeek(crons, colorMap)

  // Group slots by day+hour for cell rendering
  const slotMap = new Map<string, CalendarSlot[]>()
  for (const s of slots) {
    const key = `${s.dayOfWeek}-${s.hour}`
    const arr = slotMap.get(key) ?? []
    arr.push(s)
    slotMap.set(key, arr)
  }

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
        Calendar
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
        Weekly cron schedule view
      </p>

      {/* Always Running */}
      {alwaysRunning.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={sectionLabel}>Always Running</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {alwaysRunning.map((cron) => {
              const color = cron.agentId ? colorMap[cron.agentId] ?? 'var(--accent)' : 'var(--accent)'
              return (
                <div
                  key={cron.id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: color + '18',
                    color,
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {cron.name}
                  <span style={{ opacity: 0.6, marginLeft: '6px' }}>{cron.schedule}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Weekly Grid */}
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(7, 1fr)',
            minWidth: '700px',
          }}
        >
          {/* Header row */}
          <div style={headerCell} />
          {DAYS.map((day) => (
            <div key={day} style={{ ...headerCell, textAlign: 'center' }}>
              {day}
            </div>
          ))}

          {/* Time rows */}
          {HOURS.map((hour) => (
            <div key={hour} style={{ display: 'contents' }}>
              <div style={timeLabelStyle}>
                {hour.toString().padStart(2, '0')}:00
              </div>
              {DAYS.map((_, dow) => {
                const cellSlots = slotMap.get(`${dow}-${hour}`) ?? []
                return (
                  <div key={dow} style={cellStyle}>
                    {cellSlots.map((s, i) => (
                      <div
                        key={`${s.cronId}-${i}`}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: (s.agentColor ?? 'var(--accent)') + '22',
                          color: s.agentColor ?? 'var(--accent)',
                          fontSize: '10px',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`${s.cronName} at ${hour.toString().padStart(2, '0')}:${s.minute.toString().padStart(2, '0')}`}
                      >
                        {s.cronName}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {crons.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
          No cron jobs found.
        </div>
      )}
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  marginBottom: '8px',
}

const headerCell: React.CSSProperties = {
  padding: '8px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--separator)',
}

const timeLabelStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '11px',
  color: 'var(--text-tertiary)',
  fontFamily: 'var(--font-mono)',
  borderRight: '1px solid var(--separator)',
  borderBottom: '1px solid var(--fill-quaternary)',
  display: 'flex',
  alignItems: 'flex-start',
}

const cellStyle: React.CSSProperties = {
  padding: '2px',
  borderBottom: '1px solid var(--fill-quaternary)',
  minHeight: '28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
}
