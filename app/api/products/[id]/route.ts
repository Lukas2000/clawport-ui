import { NextResponse } from 'next/server'
import { getProduct, updateProduct, deleteProduct, computeProductProgress } from '@/lib/products'
import { logAudit } from '@/lib/audit'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const product = getProduct(id)
    if (!product) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    return NextResponse.json(product)
  } catch (err) {
    return apiErrorResponse(err, 'Failed to load product')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const product = updateProduct(id, {
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
      progress: body.progress,
    })
    if (!product) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    logAudit({ actorType: 'operator', action: 'product.updated', entityType: 'product', entityId: id, details: body })

    // Sync aggregated progress from linked goals/projects
    const computed = computeProductProgress(id)
    if (computed !== product.progress) {
      updateProduct(id, { progress: computed })
    }

    return NextResponse.json(getProduct(id))
  } catch (err) {
    return apiErrorResponse(err, 'Failed to update product')
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ok = deleteProduct(id)
    if (!ok) return apiErrorResponse(new Error('Not found'), 'Not found', 404)
    logAudit({ actorType: 'operator', action: 'product.deleted', entityType: 'product', entityId: id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err, 'Failed to delete product')
  }
}
