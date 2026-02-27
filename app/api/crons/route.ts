import { getCrons } from '@/lib/crons'
import { NextResponse } from 'next/server'

export async function GET() {
  const crons = await getCrons()
  return NextResponse.json(crons)
}
