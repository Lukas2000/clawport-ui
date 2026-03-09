export const runtime = 'nodejs'

import { loadRegistry } from '@/lib/agents-registry'
import { requireEnv } from '@/lib/env'
import { invalidate } from '@/lib/server-cache'
import { apiErrorResponse } from '@/lib/api-error'
import { syncTeamToSoulsSync } from '@/lib/team-sync'

export async function POST() {
  try {
    const workspacePath = requireEnv('WORKSPACE_PATH')
    const registry = loadRegistry()
    const updated = syncTeamToSoulsSync(workspacePath, registry)
    invalidate('agents')
    return Response.json({ ok: true, updated, total: registry.length })
  } catch (err) {
    return apiErrorResponse(err)
  }
}
