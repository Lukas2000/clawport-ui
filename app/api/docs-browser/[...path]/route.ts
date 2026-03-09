import { NextResponse } from 'next/server'
import { getDocContent } from '@/lib/docs-browser'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await params
    const relativePath = segments.join('/')
    const content = getDocContent(relativePath)
    if (content === null) {
      return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    }
    return NextResponse.json({ content, path: relativePath })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load document')
  }
}
