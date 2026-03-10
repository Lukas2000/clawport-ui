import { CronJob, CronDelivery } from '@/lib/types'
import { execFile } from 'child_process'
import { parseSchedule, describeCron } from './cron-utils'

function execFileAsync(bin: string, args: string[], opts: { encoding: 'utf-8'; timeout: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, opts, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}
import { requireEnv } from '@/lib/env'
import { loadRegistry } from '@/lib/agents-registry'

/**
 * Match a cron job name to an agent by prefix.
 * Tries each known agent ID as a prefix (longest first to avoid
 * partial matches, e.g. "seo-team" matches before "seo").
 */
function matchAgent(name: string, agentIds: string[]): string | null {
  const sorted = [...agentIds].sort((a, b) => b.length - a.length)
  for (const id of sorted) {
    if (name === id || name.startsWith(id + '-')) return id
  }
  return null
}

export async function getCrons(): Promise<CronJob[]> {
  try {
    const openclawBin = requireEnv('OPENCLAW_BIN')
    const raw = await execFileAsync(
      openclawBin,
      ['cron', 'list', '--json'],
      { encoding: 'utf-8', timeout: 10000 }
    )

    const parsed = JSON.parse(raw)
    const jobs: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed.jobs ?? parsed.data ?? []

    // Load known agent IDs for dynamic cron-to-agent matching
    // Include legacyIds so cron jobs named after the old directory-based ID still match
    const registry = loadRegistry()
    const agentIds = registry.map(a => a.id)
    // Build a map: legacyId → canonical id (for cron jobs named after old IDs)
    const legacyIdMap = new Map<string, string>(
      registry.filter(a => a.legacyId).map(a => [a.legacyId!, a.id])
    )

    return jobs.map((job: unknown) => {
      const j = job as Record<string, unknown>
      const state = (j.state as Record<string, unknown>) || {}
      const name = String(j.name || '')
      const { expression: schedule, timezone } = parseSchedule(j.schedule)

      // Status can be in state.status or directly on j.status
      const rawStatus = state.status ?? j.status ?? ''
      let status: 'ok' | 'error' | 'idle' = 'idle'
      if (rawStatus === 'error' || rawStatus === 'failed') {
        status = 'error'
      } else if (rawStatus === 'ok' || rawStatus === 'success' || rawStatus === 'completed') {
        status = 'ok'
      }

      // nextRun: try state.nextRunAtMs first, then state.nextRunAt
      const nextRunMs = state.nextRunAtMs ?? state.nextRunAt ?? j.nextRunAtMs ?? j.nextRunAt
      const nextRun = nextRunMs
        ? new Date(Number(nextRunMs)).toISOString()
        : null

      // lastRun: try state.lastRunAtMs, state.lastRunAt, or top-level equivalents
      const lastRunRaw = state.lastRunAtMs ?? state.lastRunAt ?? j.lastRunAtMs ?? j.lastRunAt ?? j.last
      const lastRun = lastRunRaw
        ? (typeof lastRunRaw === 'number' ? new Date(lastRunRaw).toISOString() : String(lastRunRaw))
        : null

      const lastError = (state.lastError ?? state.error ?? j.lastError) ? String(state.lastError ?? state.error ?? j.lastError) : null

      // Delivery config
      const rawDelivery = j.delivery as Record<string, unknown> | undefined
      let delivery: CronDelivery | null = null
      if (rawDelivery && typeof rawDelivery === 'object') {
        delivery = {
          mode: String(rawDelivery.mode || ''),
          channel: String(rawDelivery.channel || ''),
          to: rawDelivery.to ? String(rawDelivery.to) : null,
        }
      }

      // Rich state fields
      const lastDurationMs = typeof state.lastDurationMs === 'number' ? state.lastDurationMs : null
      const consecutiveErrors = typeof state.consecutiveErrors === 'number' ? state.consecutiveErrors : 0
      const lastDeliveryStatus = typeof state.lastDeliveryStatus === 'string' ? state.lastDeliveryStatus : null

      return {
        id: String(j.id || j.name || ''),
        name,
        schedule,
        scheduleDescription: describeCron(schedule),
        timezone,
        status,
        lastRun,
        nextRun,
        lastError,
        agentId: (() => {
          // Try canonical IDs first, then fall back to legacy IDs
          const match = matchAgent(name, agentIds)
          if (match) return match
          const legacyMatch = matchAgent(name, [...legacyIdMap.keys()])
          return legacyMatch ? (legacyIdMap.get(legacyMatch) ?? null) : null
        })(),
        description: typeof j.description === 'string' ? j.description : null,
        enabled: j.enabled !== false,
        delivery,
        lastDurationMs,
        consecutiveErrors,
        lastDeliveryStatus,
      }
    })
  } catch (err) {
    throw new Error(
      `Failed to fetch cron jobs: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
