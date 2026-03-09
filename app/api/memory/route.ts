import { getMemoryFiles, getMemoryConfig, getMemoryStatus, computeMemoryStats } from '@/lib/memory'
import { apiErrorResponse } from '@/lib/api-error'
import { getOrFetch } from '@/lib/server-cache'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await getOrFetch('memory', async () => {
      const files = await getMemoryFiles()
      const config = getMemoryConfig()
      const status = await getMemoryStatus()
      const stats = computeMemoryStats(files)
      return { files, config, status, stats }
    }, 60_000)
    return NextResponse.json(data)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load memory files')
  }
}
