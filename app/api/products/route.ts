import { NextResponse } from 'next/server'
import { getProducts, createProduct } from '@/lib/products'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'
import type { ProductStatus } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ProductStatus | null
    const ownerAgentId = searchParams.get('owner_agent_id')

    const filters: Record<string, unknown> = {}
    if (status) filters.status = status
    if (ownerAgentId) filters.ownerAgentId = ownerAgentId

    return NextResponse.json(getProducts(Object.keys(filters).length > 0 ? filters as never : undefined))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load products')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name) {
      return apiErrorResponse(new Error('Name is required'), 'Name is required', 400)
    }
    const product = createProduct({
      name: body.name,
      description: body.description,
      status: body.status,
      purpose: body.purpose,
      businessGoals: body.businessGoals,
      targetAudience: body.targetAudience,
      valueProposition: body.valueProposition,
      monetization: body.monetization,
      goToMarket: body.goToMarket,
      marketingMethods: body.marketingMethods,
      keyDifferentiators: body.keyDifferentiators,
      techStack: body.techStack,
      currentVersion: body.currentVersion,
      launchDate: body.launchDate,
      githubUrl: body.githubUrl,
      apiDocsUrl: body.apiDocsUrl,
      documentation: body.documentation,
      ownerAgentId: body.ownerAgentId,
    })
    logAudit({ actorType: 'operator', action: 'product.created', entityType: 'product', entityId: product.id, details: { name: product.name } })
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to create product')
  }
}
