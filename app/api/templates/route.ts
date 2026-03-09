import { NextResponse } from 'next/server'
import { listTemplateCategories, listTemplates, saveAsTemplate } from '@/lib/agent-templates'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    const categories = listTemplateCategories()
    const templates = listTemplates(category)

    return NextResponse.json({ categories, templates })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to list templates')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.category || !body.slug || !body.name || !body.content) {
      return apiErrorResponse(
        new Error('category, slug, name, and content are required'),
        'category, slug, name, and content are required',
        400
      )
    }

    const ok = saveAsTemplate(
      body.category,
      body.slug,
      body.name,
      body.description || '',
      body.color || '#3b82f6',
      body.content
    )

    if (!ok) {
      return apiErrorResponse(new Error('Failed to save'), 'Failed to save template', 500)
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to save template')
  }
}
