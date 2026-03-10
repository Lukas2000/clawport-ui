import { NextResponse } from 'next/server'
import { loadRegistry } from '@/lib/agents-registry'
import { migrateAgentIds } from '@/lib/tasks'
import { apiErrorResponse } from '@/lib/api-error'

/**
 * POST /api/agents/migrate-ids
 *
 * Migrates all SQLite references (tasks, projects, approvals, comments) from
 * old directory-name-based agent IDs to new name-based agent IDs.
 *
 * Automatically builds the old→new ID map from the agent registry's legacyId fields.
 * Accepts an optional body { idMap: Record<string, string> } to override or supplement
 * the auto-detected mapping.
 *
 * Returns { migrated: number, idMap: Record<string, string> }
 */
export async function POST(request: Request) {
  try {
    let extraMap: Record<string, string> = {}
    try {
      const body = await request.json()
      if (body?.idMap && typeof body.idMap === 'object') extraMap = body.idMap
    } catch {}

    // Build mapping from registry legacyId → id
    const registry = loadRegistry()
    const autoMap: Record<string, string> = {}
    for (const agent of registry) {
      if (agent.legacyId && agent.legacyId !== agent.id) {
        autoMap[agent.legacyId] = agent.id
      }
    }

    const idMap = { ...autoMap, ...extraMap }
    const migrated = migrateAgentIds(idMap)

    return NextResponse.json({ migrated, idMap })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to migrate agent IDs')
  }
}
