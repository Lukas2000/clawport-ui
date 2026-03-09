import type { CronJob } from './types'

export interface CalendarSlot {
  cronId: string
  cronName: string
  agentId: string | null
  agentColor: string | null
  dayOfWeek: number // 0=Sun, 1=Mon, ... 6=Sat
  hour: number // 0-23
  minute: number
}

export interface CalendarWeek {
  slots: CalendarSlot[]
  alwaysRunning: CronJob[]
}

/**
 * Parse a basic cron expression "min hour dom month dow" and extract day-of-week + hour slots.
 * Returns slots for a single week. For complex expressions, returns approximate slots.
 */
function parseCronSlots(
  schedule: string,
  cronId: string,
  cronName: string,
  agentId: string | null,
  agentColor: string | null
): { slots: CalendarSlot[]; isAlwaysRunning: boolean } {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length < 5) return { slots: [], isAlwaysRunning: false }

  const [minPart, hourPart, , , dowPart] = parts

  // Detect "always running" (runs more than once per hour)
  const isAlwaysRunning =
    (minPart.includes('/') && parseInt(minPart.split('/')[1]) <= 30) ||
    (minPart === '*' && hourPart === '*') ||
    (hourPart.includes('/') && parseInt(hourPart.split('/')[1]) <= 1)

  if (isAlwaysRunning) return { slots: [], isAlwaysRunning: true }

  const minutes = expandField(minPart, 0, 59)
  const hours = expandField(hourPart, 0, 23)
  const dows = expandField(dowPart, 0, 6)

  const slots: CalendarSlot[] = []
  for (const dow of dows) {
    for (const hour of hours) {
      for (const min of minutes) {
        slots.push({ cronId, cronName, agentId, agentColor, dayOfWeek: dow, hour, minute: min })
      }
    }
  }

  return { slots, isAlwaysRunning: false }
}

/**
 * Expand a cron field (e.g., "1,3,5", "1-5", "* /2", "*") into an array of values.
 */
function expandField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    const result: number[] = []
    for (let i = min; i <= max; i++) result.push(i)
    return result
  }

  if (field.includes('/')) {
    const [base, stepStr] = field.split('/')
    const step = parseInt(stepStr)
    const start = base === '*' ? min : parseInt(base)
    const result: number[] = []
    for (let i = start; i <= max; i += step) result.push(i)
    return result
  }

  const result: number[] = []
  for (const part of field.split(',')) {
    if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number)
      for (let i = lo; i <= hi; i++) result.push(i)
    } else {
      result.push(parseInt(part))
    }
  }

  return result.filter((n) => !isNaN(n) && n >= min && n <= max)
}

/**
 * Build calendar data for a week from cron jobs.
 * agentColorMap maps agentId -> color hex.
 */
export function buildCalendarWeek(
  crons: CronJob[],
  agentColorMap: Record<string, string>
): CalendarWeek {
  const allSlots: CalendarSlot[] = []
  const alwaysRunning: CronJob[] = []

  for (const cron of crons) {
    if (!cron.enabled) continue
    const color = cron.agentId ? agentColorMap[cron.agentId] ?? null : null
    const { slots, isAlwaysRunning } = parseCronSlots(
      cron.schedule,
      cron.id,
      cron.name,
      cron.agentId,
      color
    )
    if (isAlwaysRunning) {
      alwaysRunning.push(cron)
    } else {
      allSlots.push(...slots)
    }
  }

  return { slots: allSlots, alwaysRunning }
}
