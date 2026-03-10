import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { requireEnv } from './env'

let db: Database.Database | null = null

/**
 * Returns a singleton better-sqlite3 Database instance.
 * DB is stored at $WORKSPACE_PATH/clawport/clawport.db.
 * Creates the directory and tables on first call.
 */
export function getDb(): Database.Database {
  if (db) return db

  const workspace = requireEnv('WORKSPACE_PATH')
  const dir = path.join(workspace, 'clawport')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const dbPath = path.join(dir, 'clawport.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  migrate(db)
  return db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planning'
        CHECK(status IN ('planning','active','paused','completed')),
      priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('low','medium','high')),
      lead_agent_id TEXT,
      progress INTEGER NOT NULL DEFAULT 0
        CHECK(progress >= 0 AND progress <= 100),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'backlog'
        CHECK(status IN ('backlog','todo','in-progress','review','done','cancelled')),
      priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('low','medium','high','urgent','none')),
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      assigned_agent_id TEXT,
      assignee_role TEXT,
      labels TEXT NOT NULL DEFAULT '[]',
      due_date TEXT,
      recurring_cron TEXT,
      work_state TEXT NOT NULL DEFAULT 'idle'
        CHECK(work_state IN ('idle','starting','working','done','failed')),
      work_started_at INTEGER,
      work_error TEXT,
      work_result TEXT,
      identifier TEXT,
      issue_number INTEGER,
      parent_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      checkout_agent_id TEXT,
      checkout_at TEXT,
      started_at TEXT,
      cancelled_at TEXT,
      hidden_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author_type TEXT NOT NULL CHECK(author_type IN ('agent','operator')),
      author_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      requested_by_agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','approved','rejected','revision_requested')),
      decision_note TEXT,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at TEXT
    );

    -- Issue labels for categorization
    CREATE TABLE IF NOT EXISTS issue_labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6B7280',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Many-to-many: tasks <-> labels
    CREATE TABLE IF NOT EXISTS task_labels (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES issue_labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    -- Track read/unread state per issue
    CREATE TABLE IF NOT EXISTS issue_read_states (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (task_id)
    );

    -- Heartbeat configs: per-agent scheduling
    CREATE TABLE IF NOT EXISTS heartbeat_configs (
      agent_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      interval_minutes INTEGER NOT NULL DEFAULT 60,
      max_concurrent_runs INTEGER NOT NULL DEFAULT 1,
      last_beat_at TEXT,
      next_beat_at TEXT,
      consecutive_errors INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Heartbeat runs: execution history
    CREATE TABLE IF NOT EXISTS heartbeat_runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      trigger TEXT NOT NULL DEFAULT 'scheduled'
        CHECK(trigger IN ('scheduled','task-assigned','mention','manual')),
      status TEXT NOT NULL DEFAULT 'queued'
        CHECK(status IN ('queued','running','succeeded','failed','cancelled','timed_out')),
      started_at TEXT,
      finished_at TEXT,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      tasks_checked INTEGER NOT NULL DEFAULT 0,
      tasks_executed INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      result TEXT,
      usage_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_hb_runs_agent ON heartbeat_runs(agent_id, created_at DESC);

    -- Agent runtime status
    CREATE TABLE IF NOT EXISTS agent_status (
      agent_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'idle'
        CHECK(status IN ('idle','active','working','paused','errored','offline')),
      current_task_id TEXT,
      last_active_at TEXT,
      tasks_completed_total INTEGER NOT NULL DEFAULT 0,
      tasks_failed_total INTEGER NOT NULL DEFAULT 0,
      total_input_tokens INTEGER NOT NULL DEFAULT 0,
      total_output_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost_cents INTEGER NOT NULL DEFAULT 0,
      session_id TEXT,
      last_run_status TEXT,
      last_error TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Agent session persistence
    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      task_key TEXT,
      session_type TEXT NOT NULL DEFAULT 'heartbeat'
        CHECK(session_type IN ('heartbeat','chat','task')),
      context_summary TEXT,
      state_data TEXT NOT NULL DEFAULT '{}',
      last_run_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_session_agent_task ON agent_sessions(agent_id, task_key);

    -- Granular cost tracking
    CREATE TABLE IF NOT EXISTS cost_events (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      run_id TEXT,
      task_id TEXT,
      project_id TEXT,
      goal_id TEXT,
      provider TEXT NOT NULL DEFAULT 'anthropic',
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cached_input_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cost_agent ON cost_events(agent_id, occurred_at DESC);

    -- Optional per-agent budgets
    CREATE TABLE IF NOT EXISTS agent_budgets (
      agent_id TEXT PRIMARY KEY,
      monthly_limit_cents INTEGER,
      current_month_spent_cents INTEGER NOT NULL DEFAULT 0,
      month_key TEXT NOT NULL DEFAULT (strftime('%Y-%m','now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Immutable audit trail
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      actor_type TEXT NOT NULL CHECK(actor_type IN ('operator','agent','system')),
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      agent_id TEXT,
      run_id TEXT,
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_run ON audit_log(run_id);

    -- Approval rules for auto-triggering
    CREATE TABLE IF NOT EXISTS approval_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_condition TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Products: Mission -> Products -> Goals -> Projects -> Tasks
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('planning','active','paused','completed','deprecated')),
      purpose TEXT NOT NULL DEFAULT '',
      business_goals TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      value_proposition TEXT NOT NULL DEFAULT '',
      monetization TEXT NOT NULL DEFAULT '',
      go_to_market TEXT NOT NULL DEFAULT '',
      marketing_methods TEXT NOT NULL DEFAULT '',
      key_differentiators TEXT NOT NULL DEFAULT '',
      tech_stack TEXT NOT NULL DEFAULT '',
      current_version TEXT,
      launch_date TEXT,
      github_url TEXT,
      api_docs_url TEXT,
      documentation TEXT NOT NULL DEFAULT '',
      owner_agent_id TEXT,
      progress INTEGER NOT NULL DEFAULT 0
        CHECK(progress >= 0 AND progress <= 100),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Goals: Mission -> Products -> Goals/OKRs -> Projects -> Tasks
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'goal'
        CHECK(type IN ('goal','okr','key-result')),
      parent_goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
      owner_agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active','completed','paused','cancelled')),
      target_value REAL,
      current_value REAL DEFAULT 0,
      target_date TEXT,
      progress INTEGER NOT NULL DEFAULT 0
        CHECK(progress >= 0 AND progress <= 100),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Additive migrations for existing databases (idempotent)
  const addColumn = (table: string, column: string, type: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`) } catch { /* already exists */ }
  }
  addColumn('tasks', 'identifier', 'TEXT')
  addColumn('tasks', 'issue_number', 'INTEGER')
  addColumn('tasks', 'parent_id', 'TEXT REFERENCES tasks(id) ON DELETE SET NULL')
  addColumn('tasks', 'checkout_agent_id', 'TEXT')
  addColumn('tasks', 'checkout_at', 'TEXT')
  addColumn('tasks', 'started_at', 'TEXT')
  addColumn('tasks', 'cancelled_at', 'TEXT')
  addColumn('tasks', 'hidden_at', 'TEXT')
  addColumn('projects', 'goal_id', 'TEXT REFERENCES goals(id) ON DELETE SET NULL')
  addColumn('projects', 'product_id', 'TEXT REFERENCES products(id) ON DELETE SET NULL')
  addColumn('goals', 'product_id', 'TEXT REFERENCES products(id) ON DELETE SET NULL')
  addColumn('approvals', 'approval_type', "TEXT DEFAULT 'manual'")
  addColumn('approvals', 'context', "TEXT DEFAULT '{}'")
  addColumn('approvals', 'decided_by', 'TEXT')
}

/**
 * Close the database connection. Mainly useful for tests.
 */
export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Create an in-memory database for testing. Returns a fresh Database with the schema applied.
 */
export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:')
  testDb.pragma('foreign_keys = ON')
  migrate(testDb)
  return testDb
}
