'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import type { Agent, TaskStatus, TaskPriority, IssueLabel, Project } from '@/lib/types'
import { StatusIcon, STATUS_CONFIG } from './StatusIcon'
import { PriorityIcon, PRIORITY_CONFIG } from './PriorityIcon'

export interface IssueFilterState {
  status: TaskStatus | null
  priority: TaskPriority | null
  agentId: string | null
  labelId: string | null
  projectId: string | null
  search: string
}

interface IssueFiltersProps {
  filters: IssueFilterState
  onChange: (filters: IssueFilterState) => void
  agents: Agent[]
  labels: IssueLabel[]
  projects?: Project[]
}

function FilterDropdown({
  label,
  value,
  onClear,
  children,
}: {
  label: string
  value: string | null
  onClear: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid var(--separator)',
          background: value ? 'var(--accent-fill)' : 'transparent',
          color: value ? 'var(--accent)' : 'var(--text-secondary)',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 100ms',
        }}
      >
        {label}
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); onClear() }}
            style={{ marginLeft: '2px', opacity: 0.7, cursor: 'pointer' }}
          >
            <X size={10} />
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: '160px',
            background: 'var(--material-thick)',
            border: '1px solid var(--separator)',
            borderRadius: '8px',
            padding: '4px',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  selected,
  onClick,
  children,
}: {
  selected?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '6px 8px',
        borderRadius: '4px',
        border: 'none',
        background: selected ? 'var(--accent-fill)' : 'transparent',
        color: selected ? 'var(--accent)' : 'var(--text-primary)',
        fontSize: '12px',
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {children}
    </button>
  )
}

export function IssueFilters({ filters, onChange, agents, labels, projects }: IssueFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleSearch(value: string) {
    setSearchValue(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value })
    }, 300)
  }

  const statuses: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done', 'cancelled']
  const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid var(--separator)',
          background: 'transparent',
          minWidth: '180px',
        }}
      >
        <Search size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search issues..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '12px',
            color: 'var(--text-primary)',
            width: '100%',
          }}
        />
        {searchValue && (
          <button
            onClick={() => handleSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Status filter */}
      <FilterDropdown
        label={filters.status ? STATUS_CONFIG[filters.status].label : 'Status'}
        value={filters.status}
        onClear={() => onChange({ ...filters, status: null })}
      >
        {statuses.map(s => (
          <DropdownItem
            key={s}
            selected={filters.status === s}
            onClick={() => onChange({ ...filters, status: filters.status === s ? null : s })}
          >
            <StatusIcon status={s} size={12} />
            {STATUS_CONFIG[s].label}
          </DropdownItem>
        ))}
      </FilterDropdown>

      {/* Priority filter */}
      <FilterDropdown
        label={filters.priority ? PRIORITY_CONFIG[filters.priority].label : 'Priority'}
        value={filters.priority}
        onClear={() => onChange({ ...filters, priority: null })}
      >
        {priorities.map(p => (
          <DropdownItem
            key={p}
            selected={filters.priority === p}
            onClick={() => onChange({ ...filters, priority: filters.priority === p ? null : p })}
          >
            <PriorityIcon priority={p} size={12} />
            {PRIORITY_CONFIG[p].label}
          </DropdownItem>
        ))}
      </FilterDropdown>

      {/* Assignee filter */}
      <FilterDropdown
        label={filters.agentId ? agents.find(a => a.id === filters.agentId)?.name ?? 'Agent' : 'Assignee'}
        value={filters.agentId}
        onClear={() => onChange({ ...filters, agentId: null })}
      >
        {agents.map(a => (
          <DropdownItem
            key={a.id}
            selected={filters.agentId === a.id}
            onClick={() => onChange({ ...filters, agentId: filters.agentId === a.id ? null : a.id })}
          >
            <span style={{ fontSize: '12px' }}>{a.emoji}</span>
            {a.name}
          </DropdownItem>
        ))}
      </FilterDropdown>

      {/* Label filter */}
      {labels.length > 0 && (
        <FilterDropdown
          label={filters.labelId ? labels.find(l => l.id === filters.labelId)?.name ?? 'Label' : 'Label'}
          value={filters.labelId}
          onClear={() => onChange({ ...filters, labelId: null })}
        >
          {labels.map(l => (
            <DropdownItem
              key={l.id}
              selected={filters.labelId === l.id}
              onClick={() => onChange({ ...filters, labelId: filters.labelId === l.id ? null : l.id })}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: l.color,
                  flexShrink: 0,
                }}
              />
              {l.name}
            </DropdownItem>
          ))}
        </FilterDropdown>
      )}

      {/* Project filter */}
      {projects && projects.length > 0 && (
        <FilterDropdown
          label={filters.projectId ? projects.find(p => p.id === filters.projectId)?.name ?? 'Project' : 'Project'}
          value={filters.projectId}
          onClear={() => onChange({ ...filters, projectId: null })}
        >
          {projects.map(p => (
            <DropdownItem
              key={p.id}
              selected={filters.projectId === p.id}
              onClick={() => onChange({ ...filters, projectId: filters.projectId === p.id ? null : p.id })}
            >
              {p.name}
            </DropdownItem>
          ))}
        </FilterDropdown>
      )}
    </div>
  )
}
