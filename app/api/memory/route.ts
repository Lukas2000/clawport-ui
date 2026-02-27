import { getMemoryFiles } from '@/lib/memory'
import { NextResponse } from 'next/server'

export async function GET() {
  const files = await getMemoryFiles()
  return NextResponse.json(files)
}
