import { NextResponse } from 'next/server'
import { getProjects, createProject, getProject } from '@/lib/projects'
import { createTask } from '@/lib/tasks'
import { getGoal } from '@/lib/goals'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getProjects())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load projects')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name) {
      return apiErrorResponse(new Error('Name is required'), 'Name is required', 400)
    }
    const project = createProject(body)

    logAudit({
      actorType: 'operator',
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      details: { name: project.name, goalId: project.goalId, leadAgentId: project.leadAgentId },
    })

    // If a PM agent is assigned, create a kickoff task so they get notified
    if (project.leadAgentId) {
      const goal = project.goalId ? getGoal(project.goalId) : null
      const goalContext = goal ? `\n\nParent goal: ${goal.title}${goal.description ? `\n${goal.description}` : ''}` : ''
      createTask({
        title: `Manage project: ${project.name}`,
        description: `You have been assigned as project manager for "${project.name}".\n\n${project.description || ''}${goalContext}\n\nPlease plan the work, execute the project, and mark it complete by calling PUT /api/projects/${project.id} with {"status":"completed"} when done, or {"status":"paused"} if blocked.`,
        status: 'todo',
        priority: 'high',
        projectId: project.id,
        assignedAgentId: project.leadAgentId,
      })
    }

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create project')
  }
}
