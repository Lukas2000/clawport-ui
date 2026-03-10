// Shared types for ClawPort

export interface Agent {
  id: string               // slug, e.g. "vera" (derived from agent name)
  name: string             // display name, e.g. "VERA"
  title: string            // role title, e.g. "Chief Strategy Officer"
  reportsTo: string | null // parent agent id (null for root orchestrator)
  directReports: string[]  // child agent ids
  soulPath: string | null  // absolute path to SOUL.md
  soul: string | null      // full SOUL.md content
  voiceId: string | null   // ElevenLabs voice ID
  color: string            // hex color for node
  emoji: string            // emoji identifier
  tools: string[]          // list of tools this agent has access to
  crons: CronJob[]         // associated cron jobs
  memoryPath: string | null
  description: string      // one-liner description
}

export interface CronDelivery {
  mode: string
  channel: string
  to: string | null
}

export interface CronRun {
  ts: number
  jobId: string
  status: 'ok' | 'error'
  summary: string | null
  error: string | null
  durationMs: number
  deliveryStatus: string | null
  model: string | null
  provider: string | null
  usage: { input_tokens: number; output_tokens: number; total_tokens: number } | null
}

// ── Cost Dashboard Types ──────────────────────────────────────

export interface ModelPricing {
  inputPer1M: number
  outputPer1M: number
}

export interface RunCost {
  ts: number
  jobId: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheTokens: number
  minCost: number
}

export interface JobCostSummary {
  jobId: string
  runs: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheTokens: number
  totalCost: number
  medianCost: number
}

export interface DailyCost {
  date: string
  cost: number
  runs: number
}

export interface ModelBreakdown {
  model: string
  tokens: number
  pct: number
}

export interface TokenAnomaly {
  ts: number
  jobId: string
  totalTokens: number
  medianTokens: number
  ratio: number
}

export interface WeekOverWeek {
  thisWeek: number
  lastWeek: number
  changePct: number | null
}

export interface CacheSavings {
  cacheTokens: number
  estimatedSavings: number
}

export interface CostSummary {
  totalCost: number
  topSpender: { jobId: string; cost: number } | null
  anomalies: TokenAnomaly[]
  jobCosts: JobCostSummary[]
  dailyCosts: DailyCost[]
  modelBreakdown: ModelBreakdown[]
  runCosts: RunCost[]
  weekOverWeek: WeekOverWeek
  cacheSavings: CacheSavings
}

export interface CronJob {
  id: string
  name: string
  schedule: string              // raw cron expression
  scheduleDescription: string   // human-readable (e.g., "Daily at 8 AM")
  timezone: string | null       // extracted from schedule object if present
  status: 'ok' | 'error' | 'idle'
  lastRun: string | null
  nextRun: string | null
  lastError: string | null
  agentId: string | null        // which agent this belongs to (matched by name)
  description: string | null
  enabled: boolean
  delivery: CronDelivery | null
  lastDurationMs: number | null
  consecutiveErrors: number
  lastDeliveryStatus: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface MemoryFile {
  label: string
  path: string
  content: string
  lastModified: string
}

// ── Memory Dashboard Types ──────────────────────────────────────

export type MemoryFileCategory = 'evergreen' | 'daily' | 'other'

export interface MemoryFileInfo {
  label: string
  path: string
  relativePath: string
  content: string
  lastModified: string
  sizeBytes: number
  category: MemoryFileCategory
}

export interface MemorySearchConfig {
  enabled: boolean
  provider: string | null
  model: string | null
  hybrid: {
    enabled: boolean
    vectorWeight: number
    textWeight: number
    temporalDecay: { enabled: boolean; halfLifeDays: number }
    mmr: { enabled: boolean; lambda: number }
  }
  cache: { enabled: boolean; maxEntries: number }
  extraPaths: string[]
}

export interface MemoryFlushConfig {
  enabled: boolean
  softThresholdTokens: number
}

export interface MemoryConfig {
  memorySearch: MemorySearchConfig
  memoryFlush: MemoryFlushConfig
  configFound: boolean
}

export interface MemoryStatus {
  indexed: boolean
  lastIndexed: string | null
  totalEntries: number | null
  vectorAvailable: boolean | null
  embeddingProvider: string | null
  raw: string
}

export interface MemoryStats {
  totalFiles: number
  totalSizeBytes: number
  dailyLogCount: number
  evergreenCount: number
  oldestDaily: string | null
  newestDaily: string | null
  dailyTimeline: Array<{ date: string; sizeBytes: number } | null>
}

export interface MemoryApiResponse {
  files: MemoryFileInfo[]
  config: MemoryConfig
  status: MemoryStatus
  stats: MemoryStats
}

// ── Activity Console Types ─────────────────────────────────────

export interface LogEntry {
  id: string
  ts: number
  source: 'cron' | 'config'
  level: 'info' | 'warn' | 'error'
  category: string
  summary: string
  agentId: string | null
  jobId: string | null
  durationMs: number | null
  details: Record<string, unknown>
}

export interface LogSummary {
  totalEntries: number
  errorCount: number
  sources: { cron: number; config: number }
  timeRange: { oldest: number; newest: number } | null
  recentErrors: LogEntry[]
}

export type LogFilter = 'all' | 'error' | 'config' | 'cron'

export interface LiveLogLine {
  type: 'log' | 'meta'
  time: string
  level: string
  message: string
  raw?: string
}

// ── Project Types ─────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  priority: 'low' | 'medium' | 'high'
  leadAgentId: string | null
  goalId: string | null
  productId: string | null
  progress: number
  createdAt: string
  updatedAt: string
}

// ── Goal Types ───────────────────────────────────────────────

export type GoalType = 'goal' | 'okr' | 'key-result'

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'

export interface Goal {
  id: string
  title: string
  description: string
  type: GoalType
  parentGoalId: string | null
  ownerAgentId: string | null
  productId: string | null
  status: GoalStatus
  targetValue: number | null
  currentValue: number
  targetDate: string | null
  progress: number
  createdAt: string
  updatedAt: string
}

// ── Task Types (SQLite-backed kanban) ─────────────────────────

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'none'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string | null
  assignedAgentId: string | null
  assigneeRole: string | null
  labels: string[]
  dueDate: string | null
  recurringCron: string | null
  workState: 'idle' | 'starting' | 'working' | 'done' | 'failed'
  workStartedAt: number | null
  workError: string | null
  workResult: string | null
  identifier: string | null
  issueNumber: number | null
  parentId: string | null
  checkoutAgentId: string | null
  checkoutAt: string | null
  startedAt: string | null
  cancelledAt: string | null
  hiddenAt: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

// ── Issue Label Types ─────────────────────────────────────────

export interface IssueLabel {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface TaskComment {
  id: string
  taskId: string
  authorType: 'agent' | 'operator'
  authorId: string | null
  content: string
  createdAt: string
}

export interface TaskStats {
  thisWeek: number
  inProgress: number
  total: number
  completionPct: number
}

// ── Approval Types ────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'

export interface Approval {
  id: string
  title: string
  description: string
  requestedByAgentId: string | null
  status: ApprovalStatus
  decisionNote: string | null
  taskId: string | null
  approvalType: string
  context: string
  decidedBy: string | null
  createdAt: string
  decidedAt: string | null
}

export interface ApprovalRule {
  id: string
  name: string
  triggerCondition: string
  description: string
  enabled: boolean
  createdAt: string
}

// ── Audit Types ──────────────────────────────────────────────

export type AuditActorType = 'operator' | 'agent' | 'system'

export interface AuditEntry {
  id: string
  timestamp: string
  actorType: AuditActorType
  actorId: string | null
  action: string
  entityType: string
  entityId: string | null
  agentId: string | null
  runId: string | null
  details: Record<string, unknown>
  createdAt: string
}

// ── Workspace Profile Types ──────────────────────────────────

export interface WorkspaceProfile {
  id: string
  name: string
  path: string
  lastUsed: string
}

// ── Agent Management Types ────────────────────────────────────

export interface AgentConfigFile {
  filename: string
  label: string
  description: string
  category: 'identity' | 'behavior' | 'workflow'
  content: string
  lastModified: string | null
  isCustom: boolean
}

export interface CreateAgentRequest {
  name: string
  title: string
  emoji: string
  color: string
  reportsTo: string | null
  tools: string[]
  description: string
  templateId?: string
  soulContent?: string
}

export interface UpdateAgentRequest {
  name?: string
  title?: string
  emoji?: string
  color?: string
  tools?: string[]
  description?: string
  reportsTo?: string | null
}

export interface AgentTemplate {
  slug: string
  category: string
  name: string
  description: string
  color: string
  content: string
}

export interface TemplateCategory {
  slug: string
  label: string
  count: number
}

// ── Heartbeat Types ──────────────────────────────────────────

export interface HeartbeatConfig {
  agentId: string
  enabled: boolean
  intervalMinutes: number
  maxConcurrentRuns: number
  lastBeatAt: string | null
  nextBeatAt: string | null
  consecutiveErrors: number
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type HeartbeatTrigger = 'scheduled' | 'task-assigned' | 'mention' | 'manual'
export type HeartbeatRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out'

export interface HeartbeatRun {
  id: string
  agentId: string
  trigger: HeartbeatTrigger
  status: HeartbeatRunStatus
  startedAt: string | null
  finishedAt: string | null
  taskId: string | null
  tasksChecked: number
  tasksExecuted: number
  error: string | null
  result: string | null
  usageJson: string
  createdAt: string
}

// ── Agent Status Types ───────────────────────────────────────

export type AgentRuntimeStatus = 'idle' | 'active' | 'working' | 'paused' | 'errored' | 'offline'

export interface AgentStatus {
  agentId: string
  status: AgentRuntimeStatus
  currentTaskId: string | null
  lastActiveAt: string | null
  tasksCompletedTotal: number
  tasksFailedTotal: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostCents: number
  sessionId: string | null
  lastRunStatus: string | null
  lastError: string | null
  updatedAt: string
}

export type SessionType = 'heartbeat' | 'chat' | 'task'

export interface AgentSession {
  id: string
  agentId: string
  taskKey: string | null
  sessionType: SessionType
  contextSummary: string | null
  stateData: string
  lastRunId: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

// ── Cost Event Types ─────────────────────────────────────────

export interface CostEvent {
  id: string
  agentId: string
  runId: string | null
  taskId: string | null
  projectId: string | null
  goalId: string | null
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costCents: number
  occurredAt: string
  createdAt: string
}

export interface AgentBudget {
  agentId: string
  monthlyLimitCents: number | null
  currentMonthSpentCents: number
  monthKey: string
  updatedAt: string
}

export interface BudgetCheckResult {
  allowed: boolean
  remaining: number | null
  spent: number
  limit: number | null
}

// ── Mission Types ─────────────────────────────────────────────

export interface MissionValue {
  title: string
  description: string
}

export interface MissionData {
  mission: string
  vision: string
  values: MissionValue[]
}

// ── Product Types ─────────────────────────────────────────────

export type ProductStatus = 'planning' | 'active' | 'paused' | 'completed' | 'deprecated'

export interface Product {
  id: string
  name: string
  description: string
  status: ProductStatus
  // Identity & strategy
  purpose: string
  businessGoals: string
  targetAudience: string
  valueProposition: string
  monetization: string
  goToMarket: string
  marketingMethods: string
  keyDifferentiators: string
  // Technical
  techStack: string
  currentVersion: string | null
  launchDate: string | null
  githubUrl: string | null
  apiDocsUrl: string | null
  documentation: string
  // Meta
  ownerAgentId: string | null
  progress: number
  createdAt: string
  updatedAt: string
}
