// Run migrations to set up the auth schema in PostgreSQL.
// Called automatically on first request or manually via API.

import pool from "./db";

const MIGRATIONS = [
  // ─── Platform tables (FilyBase's own users) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS platform_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    role TEXT NOT NULL DEFAULT 'user',
    postgres_url TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS platform_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS platform_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT 'auto',
    created_at BIGINT NOT NULL
  )`,
  // ─── Per-project auth tables ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS auth_config (
    project_id TEXT PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  )`,
  `CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    email TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash TEXT,
    name TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}',
    app_metadata JSONB NOT NULL DEFAULT '{}',
    identities JSONB NOT NULL DEFAULT '[]',
    last_sign_in_at BIGINT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    PRIMARY KEY (project_id, id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (project_id, LOWER(email))`,
  `CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    token TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    ip TEXT,
    user_agent TEXT,
    replaced_by TEXT,
    PRIMARY KEY (project_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_rt_token ON auth_refresh_tokens (project_id, token)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_rt_user ON auth_refresh_tokens (project_id, user_id)`,
  `CREATE TABLE IF NOT EXISTS auth_oauth_clients (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    name TEXT NOT NULL,
    redirect_uris JSONB NOT NULL DEFAULT '[]',
    allowed_scopes JSONB NOT NULL DEFAULT '[]',
    created_at BIGINT NOT NULL,
    PRIMARY KEY (project_id, id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_oauth_client_id ON auth_oauth_clients (project_id, client_id)`,
  `CREATE TABLE IF NOT EXISTS auth_oauth_codes (
    code TEXT NOT NULL,
    project_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT '',
    code_challenge TEXT,
    code_challenge_method TEXT,
    expires_at BIGINT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (project_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT,
    actor_email TEXT,
    target_id TEXT,
    target_type TEXT,
    ip TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (project_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_audit_ts ON auth_audit_logs (project_id, timestamp DESC)`,
];

let migrated = false;

export async function ensureMigrated(): Promise<void> {
  if (migrated) return;
  const client = await pool.connect();
  try {
    for (const sql of MIGRATIONS) {
      await client.query(sql);
    }
    migrated = true;
  } finally {
    client.release();
  }
}
