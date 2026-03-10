import { NextResponse } from 'next/server'
import { getProject, updateProject, deleteProject } from '@/lib/projects'
import { createTask } from '@/lib/tasks'
import { getGoal } from '@/lib/goals'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = getProject(id)
    if (!project) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json(project)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load project')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const before = getProject(id)
    if (!before) return apiErrorResponse(new Error('Not found'), 'Not found', 404)

    const project = updateProject(id, body)
    if (!project) return apiErrorResponse(new Error('Not found'), 'Not found', 404)

    logAudit({
      actorType: body._actorType === 'agent' ? 'agent' : 'operator',
      actorId: body._actorId ?? null,
      agentId: body._actorType === 'agent' ? (body._actorId ?? null) : null,
      action: 'project.updated',
      entityType: 'project',
      entityId: project.id,
      details: { changes: body, name: project.name },
    })

    // If leadAgentId was newly set (or changed), create a PM kickoff task
    if (body.leadAgentId !== undefined && body.leadAgentId && body.leadAgentId !== before.leadAgentId) {
      const goal = project.goalId ? getGoal(project.goalId) : null
      const goalContext = goal ? `\n\nParent goal: ${goal.title}${goal.description ? `\n${goal.description}` : ''}` : ''
      createTask({
        title: `Manage project: ${project.name}`,
        description: `You have been assigned as project manager for "${project.name}".\n\n${project.description || ''}${goalContext}\n\nPlan the work, execute the project, and mark it complete by calling PUT /api/projects/${project.id} with {"status":"completed"} when done, or {"status":"paused"} if blocked.`,
        status: 'todo',
        priority: 'high',
        projectId: project.id,
        assignedAgentId: body.leadAgentId,
      })
    }

    return NextResponse.json(project)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update project')
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = getProject(id)
    const ok = deleteProject(id)
    if (!ok) return apiErrorResponse(new Error('Not found'), 'Not found', 404)

    logAudit({
      actorType: 'operator',
      action: 'project.deleted',
      entityType: 'project',
      entityId: id,
      details: { name: project?.name },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to delete project')
  }
}
