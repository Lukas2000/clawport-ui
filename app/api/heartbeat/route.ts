import { NextResponse } from 'next/server'
import { getHeartbeatConfigs, getDueHeartbeats, queueHeartbeatRun, startNextQueuedRun, scheduleNextBeat, reapOrphanedRuns } from '@/lib/heartbeat'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET() {
  try {
    return NextResponse.json(getHeartbeatConfigs())
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load heartbeat configs')
  }
}

/**
 * POST /api/heartbeat -- tick: queue runs for all due heartbeats, start queued runs, reap orphans.
 */
export async function POST() {
  try {
    // Reap orphaned runs first
    const reaped = reapOrphanedRuns()

    // Queue runs for due heartbeats
    const due = getDueHeartbeats()
    const queued: string[] = []
    for (const config of due) {
      queueHeartbeatRun(config.agentId, 'scheduled')
      scheduleNextBeat(config.agentId)
      queued.push(config.agentId)
    }

    // Start queued runs (respecting concurrency)
    const started: string[] = []
    for (const config of getHeartbeatConfigs()) {
      const run = startNextQueuedRun(config.agentId)
      if (run) started.push(run.id)
    }

    return NextResponse.json({ queued, started, reaped })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to tick heartbeats')
  }
}
