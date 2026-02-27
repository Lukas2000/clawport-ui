import { getAgents } from '@/lib/agents'
import { NextResponse } from 'next/server'

export async function GET() {
  const agents = await getAgents()
  return NextResponse.json(agents)
}
