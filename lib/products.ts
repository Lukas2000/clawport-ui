import { getDb } from './db'
import { generateId } from './id'
import type { Product, ProductStatus } from './types'

interface ProductRow {
  id: string
  name: string
  description: string
  status: string
  purpose: string
  business_goals: string
  target_audience: string
  value_proposition: string
  monetization: string
  go_to_market: string
  marketing_methods: string
  key_differentiators: string
  tech_stack: string
  current_version: string | null
  launch_date: string | null
  github_url: string | null
  api_docs_url: string | null
  documentation: string
  owner_agent_id: string | null
  progress: number
  created_at: string
  updated_at: string
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as ProductStatus,
    purpose: row.purpose,
    businessGoals: row.business_goals,
    targetAudience: row.target_audience,
    valueProposition: row.value_proposition,
    monetization: row.monetization,
    goToMarket: row.go_to_market,
    marketingMethods: row.marketing_methods,
    keyDifferentiators: row.key_differentiators,
    techStack: row.tech_stack,
    currentVersion: row.current_version,
    launchDate: row.launch_date,
    githubUrl: row.github_url,
    apiDocsUrl: row.api_docs_url,
    documentation: row.documentation,
    ownerAgentId: row.owner_agent_id,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface ProductFilters {
  status?: ProductStatus
  ownerAgentId?: string
}

export function getProducts(filters?: ProductFilters, db = getDb()): Product[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters?.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters?.ownerAgentId) {
    conditions.push('owner_agent_id = ?')
    params.push(filters.ownerAgentId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM products ${where} ORDER BY created_at DESC`)
    .all(...params) as ProductRow[]
  return rows.map(rowToProduct)
}

export function getProduct(id: string, db = getDb()): Product | null {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined
  return row ? rowToProduct(row) : null
}

export function createProduct(
  data: {
    name: string
    description?: string
    status?: ProductStatus
    purpose?: string
    businessGoals?: string
    targetAudience?: string
    valueProposition?: string
    monetization?: string
    goToMarket?: string
    marketingMethods?: string
    keyDifferentiators?: string
    techStack?: string
    currentVersion?: string | null
    launchDate?: string | null
    githubUrl?: string | null
    apiDocsUrl?: string | null
    documentation?: string
    ownerAgentId?: string | null
  },
  db = getDb()
): Product {
  const id = generateId()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO products (
      id, name, description, status, purpose, business_goals, target_audience,
      value_proposition, monetization, go_to_market, marketing_methods, key_differentiators,
      tech_stack, current_version, launch_date, github_url, api_docs_url, documentation,
      owner_agent_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.description ?? '',
    data.status ?? 'planning',
    data.purpose ?? '',
    data.businessGoals ?? '',
    data.targetAudience ?? '',
    data.valueProposition ?? '',
    data.monetization ?? '',
    data.goToMarket ?? '',
    data.marketingMethods ?? '',
    data.keyDifferentiators ?? '',
    data.techStack ?? '',
    data.currentVersion ?? null,
    data.launchDate ?? null,
    data.githubUrl ?? null,
    data.apiDocsUrl ?? null,
    data.documentation ?? '',
    data.ownerAgentId ?? null,
    now,
    now
  )
  return getProduct(id, db)!
}

export function updateProduct(
  id: string,
  data: Partial<{
    name: string
    description: string
    status: ProductStatus
    purpose: string
    businessGoals: string
    targetAudience: string
    valueProposition: string
    monetization: string
    goToMarket: string
    marketingMethods: string
    keyDifferentiators: string
    techStack: string
    currentVersion: string | null
    launchDate: string | null
    githubUrl: string | null
    apiDocsUrl: string | null
    documentation: string
    ownerAgentId: string | null
    progress: number
  }>,
  db = getDb()
): Product | null {
  const fields: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.purpose !== undefined) { fields.push('purpose = ?'); values.push(data.purpose) }
  if (data.businessGoals !== undefined) { fields.push('business_goals = ?'); values.push(data.businessGoals) }
  if (data.targetAudience !== undefined) { fields.push('target_audience = ?'); values.push(data.targetAudience) }
  if (data.valueProposition !== undefined) { fields.push('value_proposition = ?'); values.push(data.valueProposition) }
  if (data.monetization !== undefined) { fields.push('monetization = ?'); values.push(data.monetization) }
  if (data.goToMarket !== undefined) { fields.push('go_to_market = ?'); values.push(data.goToMarket) }
  if (data.marketingMethods !== undefined) { fields.push('marketing_methods = ?'); values.push(data.marketingMethods) }
  if (data.keyDifferentiators !== undefined) { fields.push('key_differentiators = ?'); values.push(data.keyDifferentiators) }
  if (data.techStack !== undefined) { fields.push('tech_stack = ?'); values.push(data.techStack) }
  if (data.currentVersion !== undefined) { fields.push('current_version = ?'); values.push(data.currentVersion) }
  if (data.launchDate !== undefined) { fields.push('launch_date = ?'); values.push(data.launchDate) }
  if (data.githubUrl !== undefined) { fields.push('github_url = ?'); values.push(data.githubUrl) }
  if (data.apiDocsUrl !== undefined) { fields.push('api_docs_url = ?'); values.push(data.apiDocsUrl) }
  if (data.documentation !== undefined) { fields.push('documentation = ?'); values.push(data.documentation) }
  if (data.ownerAgentId !== undefined) { fields.push('owner_agent_id = ?'); values.push(data.ownerAgentId) }
  if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress) }

  if (fields.length === 0) return getProduct(id, db)

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getProduct(id, db)
}

export function deleteProduct(id: string, db = getDb()): boolean {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Compute aggregated progress for a product based on linked goals and projects.
 */
export function computeProductProgress(id: string, db = getDb()): number {
  const goals = db
    .prepare('SELECT progress FROM goals WHERE product_id = ?')
    .all(id) as { progress: number }[]
  const projects = db
    .prepare('SELECT progress FROM projects WHERE product_id = ?')
    .all(id) as { progress: number }[]

  const allProgress = [
    ...goals.map(g => g.progress),
    ...projects.map(p => p.progress),
  ]

  if (allProgress.length === 0) return 0
  return Math.round(allProgress.reduce((sum, p) => sum + p, 0) / allProgress.length)
}
