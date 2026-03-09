import { NextResponse } from 'next/server'
import { getTemplate, overwriteTemplate } from '@/lib/agent-templates'
import { apiErrorResponse } from '@/lib/api-error'

type Params = Promise<{ category: string; slug: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { category, slug } = await params
    const template = getTemplate(category, slug)
    if (!template) {
      return apiErrorResponse(new Error('Template not found'), 'Template not found', 404)
    }
    return NextResponse.json(template)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to get template')
  }
}

export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { category, slug } = await params
    const body = await request.json()

    if (typeof body.content !== 'string') {
      return apiErrorResponse(new Error('content string required'), 'content string required', 400)
    }

    const ok = overwriteTemplate(category, slug, body.content)
    if (!ok) {
      return apiErrorResponse(new Error('Template not found'), 'Template not found', 404)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update template')
  }
}
