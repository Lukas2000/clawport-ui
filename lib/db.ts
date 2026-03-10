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
        CHECK(status IN ('pending','approved','rejected')),
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

    -- Goals: Mission -> Goals/OKRs -> Projects -> Tasks
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
