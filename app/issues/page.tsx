'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Task, Agent, IssueLabel, TaskComment, TaskStatus, Project } from '@/lib/types'
import { IssueFilters, type IssueFilterState } from '@/components/issues/IssueFilters'
import { IssuesList, type GroupBy, type SortField, type SortDir } from '@/components/issues/IssuesList'
import { IssueBoard } from '@/components/issues/IssueBoard'
import { IssueDetail } from '@/components/issues/IssueDetail'
import { NewIssueDialog } from '@/components/issues/NewIssueDialog'
import { Plus, List, LayoutGrid, ArrowUpDown, Layers, Filter, X } from 'lucide-react'

type ViewMode = 'list' | 'board'

export default function IssuesPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [labels, setLabels] = useState<IssueLabel[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [taskLabels, setTaskLabels] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const [filters, setFilters] = useState<IssueFilterState>({
    status: null,
    priority: null,
    agentId: null,
    labelId: null,
    search: '',
  })

  // Detail panel data
  const [comments, setComments] = useState<TaskComment[]>([])
  const [subIssues, setSubIssues] = useState<Task[]>([])
  const [ancestry, setAncestry] = useState<Task[]>([])
  const [selectedTaskLabels, setSelectedTaskLabels] = useState<IssueLabel[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.agentId) params.set('agent_id', filters.agentId)
      if (filters.search) params.set('search', filters.search)
      params.set('exclude_hidden', 'true')

      const [tasksRes, agentsRes, labelsRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks?${params}`),
        fetch('/api/agents'),
        fetch('/api/labels'),
        fetch('/api/projects'),
      ])

      const tasksData = await tasksRes.json()
      const agentsData = await agentsRes.json()
      const labelsData = await labelsRes.json()
      const projectsData = await projectsRes.json()

      setTasks(Array.isArray(tasksData) ? tasksData : [])
      setAgents(Array.isArray(agentsData) ? agentsData : [])
      setLabels(Array.isArray(labelsData) ? labelsData : [])
      setProjects(Array.isArray(projectsData) ? projectsData : [])

      // Load task labels for all tasks
      if (Array.isArray(tasksData) && tasksData.length > 0) {
        const labelPromises = tasksData.map((t: Task) =>
          fetch(`/api/tasks/${t.id}/labels`).then(r => r.json()).then(
            (lbls: IssueLabel[]) => [t.id, lbls.map(l => l.id)] as [string, string[]]
          ).catch(() => [t.id, []] as [string, string[]])
        )
        const labelResults = await Promise.all(labelPromises)
        setTaskLabels(Object.fromEntries(labelResults))
      }
    } catch {
      // silently handle errors
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.priority, filters.agentId, filters.search])

  useEffect(() => { loadData() }, [loadData])

  // Load detail data when task is selected
  useEffect(() => {
    if (!selectedTask) return
    const id = selectedTask.id

    Promise.all([
      fetch(`/api/tasks/${id}/comments`).then(r => r.json()).catch(() => []),
      fetch(`/api/tasks?parent_id=${id}&exclude_hidden=true`).catch(() => null),
      fetch(`/api/tasks/${id}/labels`).then(r => r.json()).catch(() => []),
    ]).then(([commentsData, , labelsData]) => {
      setComments(Array.isArray(commentsData) ? commentsData : [])
      setSubIssues(tasks.filter(t => t.parentId === id))
      setSelectedTaskLabels(Array.isArray(labelsData) ? labelsData : [])
      const anc: Task[] = []
      let current = selectedTask
      for (let i = 0; i < 10 && current?.parentId; i++) {
        const parent = tasks.find(t => t.id === current!.parentId)
        if (!parent) break
        anc.push(parent)
        current = parent
      }
      setAncestry(anc)
    })
  }, [selectedTask, tasks])

  // Filter by label client-side
  let filteredTasks = tasks
  if (filters.labelId) {
    filteredTasks = tasks.filter(t => (taskLabels[t.id] ?? []).includes(filters.labelId!))
  }

  // Sub-issue counts
  const subIssueCounts: Record<string, number> = {}
  for (const t of tasks) {
    if (t.parentId) {
      subIssueCounts[t.parentId] = (subIssueCounts[t.parentId] ?? 0) + 1
    }
  }

  // Active filter count
  const activeFilterCount = [filters.status, filters.priority, filters.agentId, filters.labelId, filters.search].filter(Boolean).length

  async function handleCreate(data: {
    title: string
    description: string
    status: TaskStatus
    priority: string
    assignedAgentId: string | null
    projectId: string | null
    parentId: string | null
    dueDate: string | null
  }) {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setShowCreate(false)
      loadData()
    } catch { /* ignore */ }
  }

  async function handleMove(taskId: string, status: TaskStatus) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      loadData()
    } catch { /* ignore */ }
  }

  async function handleUpdate(data: Record<string, unknown>) {
    if (!selectedTask) return
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json()
      setSelectedTask(updated)
      loadData()
    } catch { /* ignore */ }
  }

  async function handleAddComment(content: string) {
    if (!selectedTask) return
    try {
      await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, authorType: 'operator' }),
      })
      const res = await fetch(`/api/tasks/${selectedTask.id}/comments`)
      const data = await res.json()
      setComments(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
          flexShrink: 0,
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Issues
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {filteredTasks.length} issue{filteredTasks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* View switcher */}
          <div
            style={{
              display: 'flex',
              borderRadius: '6px',
              border: '1px solid var(--separator)',
              overflow: 'hidden',
            }}
          >
            {([
              { mode: 'list' as ViewMode, icon: List, label: 'List' },
              { mode: 'board' as ViewMode, icon: LayoutGrid, label: 'Board' },
            ]).map(v => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                title={v.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  border: 'none',
                  background: viewMode === v.mode ? 'var(--accent-fill)' : 'transparent',
                  color: viewMode === v.mode ? 'var(--accent)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  gap: '4px',
                }}
              >
                <v.icon size={14} />
              </button>
            ))}
          </div>

          {/* Filter count badge */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ status: null, priority: null, agentId: null, labelId: null, search: '' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent-fill)',
                color: 'var(--accent)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Filter size={11} />
              Filters: {activeFilterCount}
              <X size={10} style={{ opacity: 0.7 }} />
            </button>
          )}

          {/* Sort button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowSortMenu(!showSortMenu); setShowGroupMenu(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--separator)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <ArrowUpDown size={12} />
              Sort
            </button>
            {showSortMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowSortMenu(false)} />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  minWidth: '150px',
                  background: 'var(--material-thick)',
                  border: '1px solid var(--separator)',
                  borderRadius: '8px',
                  padding: '4px',
                  zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}>
                  {([
                    { field: 'created' as SortField, label: 'Created' },
                    { field: 'updated' as SortField, label: 'Updated' },
                    { field: 'priority' as SortField, label: 'Priority' },
                    { field: 'title' as SortField, label: 'Title' },
                  ]).map(s => (
                    <button
                      key={s.field}
                      onClick={() => {
                        if (sortField === s.field) {
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField(s.field)
                          setSortDir('desc')
                        }
                        setShowSortMenu(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        borderRadius: '4px',
                        background: sortField === s.field ? 'var(--accent-fill)' : 'transparent',
                        color: sortField === s.field ? 'var(--accent)' : 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: sortField === s.field ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {s.label}
                      {sortField === s.field && (
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {sortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Group button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowGroupMenu(!showGroupMenu); setShowSortMenu(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--separator)',
                background: groupBy !== 'none' ? 'var(--accent-fill)' : 'transparent',
                color: groupBy !== 'none' ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Layers size={12} />
              Group
            </button>
            {showGroupMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowGroupMenu(false)} />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  minWidth: '140px',
                  background: 'var(--material-thick)',
                  border: '1px solid var(--separator)',
                  borderRadius: '8px',
                  padding: '4px',
                  zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}>
                  {([
                    { value: 'status' as GroupBy, label: 'Status' },
                    { value: 'priority' as GroupBy, label: 'Priority' },
                    { value: 'assignee' as GroupBy, label: 'Assignee' },
                    { value: 'none' as GroupBy, label: 'None' },
                  ]).map(g => (
                    <button
                      key={g.value}
                      onClick={() => { setGroupBy(g.value); setShowGroupMenu(false) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '6px 8px',
                        border: 'none',
                        borderRadius: '4px',
                        background: groupBy === g.value ? 'var(--accent-fill)' : 'transparent',
                        color: groupBy === g.value ? 'var(--accent)' : 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: groupBy === g.value ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '5px',
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            New Issue
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
        <IssueFilters
          filters={filters}
          onChange={setFilters}
          agents={agents}
          labels={labels}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '100%',
                      maxWidth: '600px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'var(--fill-quaternary)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <IssuesList
              tasks={filteredTasks}
              agents={agents}
              labels={labels}
              taskLabels={taskLabels}
              onSelect={(t) => setSelectedTask(t)}
              selectedId={selectedTask?.id}
              groupBy={groupBy}
              sortField={sortField}
              sortDir={sortDir}
            />
          ) : (
            <IssueBoard
              tasks={filteredTasks}
              agents={agents}
              labels={labels}
              taskLabels={taskLabels}
              onSelect={(t) => setSelectedTask(t)}
              onMove={handleMove}
              onCreate={() => setShowCreate(true)}
              subIssueCounts={subIssueCounts}
            />
          )}
        </div>

        {/* Detail sidebar */}
        {selectedTask && (
          <IssueDetail
            task={selectedTask}
            agents={agents}
            projects={projects}
            allLabels={labels}
            taskLabels={selectedTaskLabels}
            comments={comments}
            subIssues={subIssues}
            ancestry={ancestry}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleUpdate}
            onAddComment={handleAddComment}
          />
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <NewIssueDialog
          agents={agents}
          labels={labels}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
