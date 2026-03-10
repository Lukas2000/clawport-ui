import { NextResponse } from 'next/server'
import { getAuditLog, getAuditCount } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'
import type { AuditActorType } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters: Record<string, string | number> = {}
    if (searchParams.get('entityType')) filters.entityType = searchParams.get('entityType')!
    if (searchParams.get('entityId')) filters.entityId = searchParams.get('entityId')!
    if (searchParams.get('agentId')) filters.agentId = searchParams.get('agentId')!
    if (searchParams.get('actorType')) filters.actorType = searchParams.get('actorType')! as AuditActorType
    if (searchParams.get('action')) filters.action = searchParams.get('action')!
    if (searchParams.get('runId')) filters.runId = searchParams.get('runId')!
    if (searchParams.get('since')) filters.since = searchParams.get('since')!
    if (searchParams.get('until')) filters.until = searchParams.get('until')!
    if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit')!, 10)
    if (searchParams.get('offset')) filters.offset = parseInt(searchParams.get('offset')!, 10)

    const hasFilters = Object.keys(filters).length > 0
    const entries = getAuditLog(hasFilters ? filters as never : undefined)
    const total = getAuditCount(hasFilters ? filters as never : undefined)

    return NextResponse.json({ entries, total })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load audit log')
  }
}
