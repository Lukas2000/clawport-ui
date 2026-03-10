'use client'

import { useState } from 'react'
import type { Agent, IssueLabel, TaskStatus, TaskPriority } from '@/lib/types'
import { StatusIcon, STATUS_CONFIG } from './StatusIcon'
import { PriorityIcon, PRIORITY_CONFIG } from './PriorityIcon'
import { X } from 'lucide-react'

interface NewIssueDialogProps {
  agents: Agent[]
  labels: IssueLabel[]
  projects: { id: string; name: string }[]
  parentId?: string | null
  onSubmit: (data: {
    title: string
    description: string
    status: TaskStatus
    priority: TaskPriority
    assignedAgentId: string | null
    projectId: string | null
    parentId: string | null
    dueDate: string | null
  }) => void
  onClose: () => void
}

export function NewIssueDialog({
  agents,
  labels,
  projects,
  parentId,
  onSubmit,
  onClose,
}: NewIssueDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('backlog')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assignedAgentId, setAssignedAgentId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignedAgentId,
      projectId,
      parentId: parentId ?? null,
      dueDate: dueDate || null,
    })
  }

  const statuses: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review']
  const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--material-thick)',
          borderRadius: '12px',
          border: '1px solid var(--separator)',
          width: '480px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--separator)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {parentId ? 'New Sub-issue' : 'New Issue'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Title */}
          <input
            type="text"
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--separator)',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--separator)',
              background: 'transparent',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />

          {/* Properties grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Assignee</label>
              <select
                value={assignedAgentId ?? ''}
                onChange={(e) => setAssignedAgentId(e.target.value || null)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">Unassigned</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Project</label>
              <select
                value={projectId ?? ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--separator)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">No project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--separator)',
                background: 'transparent',
                fontSize: '12px',
                color: 'var(--text-primary)',
                outline: 'none',
                maxWidth: '200px',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '12px 20px 16px',
            borderTop: '1px solid var(--separator)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--separator)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: title.trim() ? 'var(--accent)' : 'var(--fill-tertiary)',
              color: title.trim() ? 'white' : 'var(--text-quaternary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: title.trim() ? 'pointer' : 'default',
            }}
          >
            Create Issue
          </button>
        </div>
      </form>
    </div>
  )
}
