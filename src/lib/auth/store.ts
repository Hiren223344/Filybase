// PostgreSQL-backed per-project auth store.

import { query, queryOne, execute } from "./db";
import { ensureMigrated } from "./migrate";
import { randomToken } from "./crypto";
import {
  AuthUser,
  AuditLogEntry,
  OAuthAuthCode,
  OAuthClient,
  ProjectAuthConfig,
  RefreshTokenRecord,
} from "./types";

// Auto-migrate on first call
let ready: Promise<void> | null = null;
function init() {
  if (!ready) ready = ensureMigrated();
  return ready;
}

// ---------- Config ----------

export async function getConfig(projectId: string): Promise<ProjectAuthConfig> {
  await init();
  const row = await queryOne<{ config: ProjectAuthConfig }>(
    "SELECT config FROM auth_config WHERE project_id = $1",
    [projectId]
  );
  if (row) return { ...row.config, projectId };

  // Auto-create default config
  const now = Date.now();
  const fresh: ProjectAuthConfig = {
    projectId,
    jwtSecret: randomToken(48),
    jwtAccessTtlSec: 3600,
    jwtIssuer: `filybase:${projectId}`,
    refreshTokenTtlSec: 60 * 60 * 24 * 30,
    serviceRoleKey: `fb_srv_${randomToken(32)}`,
    anonKey: `fb_anon_${randomToken(24)}`,
    disableSignup: false,
    requireEmailConfirmation: false,
    siteUrl: "http://localhost:3000",
    allowedRedirects: ["http://localhost:3000"],
    providers: {
      email: { enabled: true },
      google: { enabled: false },
      github: { enabled: false },
      discord: { enabled: false },
      apple: { enabled: false },
    },
    emailConfig: {
      smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "",
      senderEmail: "", senderName: "FilyBase Auth",
      enableSignupConfirmation: false,
      enablePasswordChangedNotification: false,
      enableEmailChangedNotification: false,
      confirmationTemplate: "", recoveryTemplate: "",
      magicLinkTemplate: "", inviteTemplate: "",
    },
    passwordPolicy: {
      minLength: 8, requireUppercase: false, requireLowercase: false,
      requireNumbers: false, requireSpecialChars: false, preventReuse: 0, maxAge: 0,
    },
    sessionConfig: {
      singleSessionPerUser: false, inactivityTimeout: 0, absoluteTimeout: 0,
      refreshTokenRotation: true, reuseInterval: 10,
    },
    rateLimits: {
      signupPerHour: 60, signinPerHour: 300, tokenRefreshPerHour: 600,
      emailSentPerHour: 30, smsPerHour: 30, rateLimitHeader: "x-forwarded-for",
    },
    mfaConfig: {
      enabled: false, totpEnabled: true, maxFactors: 10,
      enforceForAllUsers: false, gracePeriodDays: 7,
    },
    urlConfig: {
      siteUrl: "http://localhost:3000", redirectUrls: ["http://localhost:3000"],
      emailConfirmationPath: "/auth/confirm", passwordRecoveryPath: "/auth/recovery",
      emailChangePath: "/auth/confirm-email-change", magicLinkPath: "/auth/magic-link",
    },
    attackProtection: {
      bruteForceEnabled: true, maxFailedAttempts: 10, lockoutDurationSec: 900,
      captchaEnabled: false, captchaProvider: "none", captchaSecret: "",
      captchaSiteKey: "", ipThrottleEnabled: true, ipThrottleMaxPerMinute: 60,
    },
    hooks: [],
    oauthServerEnabled: true,
    oauthAuthorizationPath: "/oauth/consent",
    createdAt: now,
    updatedAt: now,
  };
  await execute(
    "INSERT INTO auth_config (project_id, config, created_at, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (project_id) DO NOTHING",
    [projectId, JSON.stringify(fresh), now, now]
  );
  return fresh;
}

export async function updateConfig(projectId: string, patch: Partial<ProjectAuthConfig>): Promise<ProjectAuthConfig> {
  await init();
  const current = await getConfig(projectId);
  const next: ProjectAuthConfig = {
    ...current,
    ...patch,
    providers: { ...current.providers, ...(patch.providers ?? {}) },
    projectId,
    updatedAt: Date.now(),
  };
  await execute(
    "UPDATE auth_config SET config = $1, updated_at = $2 WHERE project_id = $3",
    [JSON.stringify(next), next.updatedAt, projectId]
  );
  return next;
}

// ---------- Users ----------

export async function listUsers(
  projectId: string,
  opts: { limit?: number; offset?: number; search?: string } = {}
): Promise<{ users: AuthUser[]; total: number }> {
  await init();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  let where = "project_id = $1";
  const params: any[] = [projectId];
  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    where += ` AND (LOWER(email) LIKE $${params.length} OR LOWER(name) LIKE $${params.length} OR id LIKE $${params.length})`;
  }
  const countRow = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM auth_users WHERE ${where}`, params);
  const total = parseInt(countRow?.count ?? "0", 10);
  const rows = await query<any>(
    `SELECT * FROM auth_users WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { users: rows.map(rowToUser), total };
}

export async function getUserByEmail(projectId: string, email: string): Promise<AuthUser | null> {
  await init();
  const row = await queryOne<any>(
    "SELECT * FROM auth_users WHERE project_id = $1 AND LOWER(email) = LOWER($2)",
    [projectId, email]
  );
  return row ? rowToUser(row) : null;
}

export async function getUserById(projectId: string, id: string): Promise<AuthUser | null> {
  await init();
  const row = await queryOne<any>(
    "SELECT * FROM auth_users WHERE project_id = $1 AND id = $2",
    [projectId, id]
  );
  return row ? rowToUser(row) : null;
}

export async function upsertUser(projectId: string, user: AuthUser): Promise<AuthUser> {
  await init();
  await execute(
    `INSERT INTO auth_users (id, project_id, email, email_verified, password_hash, name, avatar_url, status, metadata, app_metadata, identities, last_sign_in_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (project_id, id) DO UPDATE SET
       email=EXCLUDED.email, email_verified=EXCLUDED.email_verified, password_hash=EXCLUDED.password_hash,
       name=EXCLUDED.name, avatar_url=EXCLUDED.avatar_url, status=EXCLUDED.status,
       metadata=EXCLUDED.metadata, app_metadata=EXCLUDED.app_metadata, identities=EXCLUDED.identities,
       last_sign_in_at=EXCLUDED.last_sign_in_at, updated_at=EXCLUDED.updated_at`,
    [user.id, projectId, user.email, user.emailVerified, user.passwordHash ?? null,
     user.name ?? null, user.avatarUrl ?? null, user.status,
     JSON.stringify(user.metadata), JSON.stringify(user.appMetadata),
     JSON.stringify(user.identities), user.lastSignInAt ?? null, user.createdAt, user.updatedAt]
  );
  return user;
}

export async function deleteUser(projectId: string, id: string): Promise<boolean> {
  await init();
  const count = await execute("DELETE FROM auth_users WHERE project_id = $1 AND id = $2", [projectId, id]);
  if (count > 0) {
    await execute("UPDATE auth_refresh_tokens SET revoked = TRUE WHERE project_id = $1 AND user_id = $2", [projectId, id]);
  }
  return count > 0;
}

export async function patchUser(projectId: string, id: string, patch: Partial<AuthUser>): Promise<AuthUser | null> {
  await init();
  const user = await getUserById(projectId, id);
  if (!user) return null;
  const merged: AuthUser = { ...user, ...patch, id, updatedAt: Date.now() };
  await upsertUser(projectId, merged);
  return merged;
}

function rowToUser(row: any): AuthUser {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified,
    passwordHash: row.password_hash,
    name: row.name,
    avatarUrl: row.avatar_url,
    status: row.status,
    metadata: row.metadata ?? {},
    appMetadata: row.app_metadata ?? {},
    identities: row.identities ?? [],
    lastSignInAt: row.last_sign_in_at ? Number(row.last_sign_in_at) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

// ---------- Refresh tokens ----------

export async function addRefreshToken(projectId: string, rec: RefreshTokenRecord): Promise<RefreshTokenRecord> {
  await init();
  await execute(
    `INSERT INTO auth_refresh_tokens (id, project_id, token, user_id, created_at, expires_at, revoked, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [rec.id, projectId, rec.token, rec.userId, rec.createdAt, rec.expiresAt, rec.revoked, rec.ip, rec.userAgent]
  );
  return rec;
}

export async function findRefreshToken(projectId: string, token: string): Promise<RefreshTokenRecord | null> {
  await init();
  const row = await queryOne<any>(
    "SELECT * FROM auth_refresh_tokens WHERE project_id = $1 AND token = $2",
    [projectId, token]
  );
  return row ? rowToRT(row) : null;
}

export async function rotateRefreshToken(projectId: string, oldToken: string, next: RefreshTokenRecord): Promise<void> {
  await init();
  await execute(
    "UPDATE auth_refresh_tokens SET revoked = TRUE, replaced_by = $1 WHERE project_id = $2 AND token = $3",
    [next.id, projectId, oldToken]
  );
  await addRefreshToken(projectId, next);
}

export async function revokeRefreshToken(projectId: string, token: string): Promise<void> {
  await init();
  await execute("UPDATE auth_refresh_tokens SET revoked = TRUE WHERE project_id = $1 AND token = $2", [projectId, token]);
}

export async function revokeAllUserTokens(projectId: string, userId: string): Promise<void> {
  await init();
  await execute("UPDATE auth_refresh_tokens SET revoked = TRUE WHERE project_id = $1 AND user_id = $2", [projectId, userId]);
}

export async function countActiveSessions(projectId: string): Promise<number> {
  await init();
  const row = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM auth_refresh_tokens WHERE project_id = $1 AND revoked = FALSE AND expires_at > $2",
    [projectId, Date.now()]
  );
  return parseInt(row?.count ?? "0", 10);
}

export async function listActiveSessions(projectId: string, userId?: string): Promise<RefreshTokenRecord[]> {
  await init();
  let sql = "SELECT * FROM auth_refresh_tokens WHERE project_id = $1 AND revoked = FALSE AND expires_at > $2";
  const params: any[] = [projectId, Date.now()];
  if (userId) { sql += " AND user_id = $3"; params.push(userId); }
  sql += " ORDER BY created_at DESC";
  const rows = await query<any>(sql, params);
  return rows.map(rowToRT);
}

export async function revokeSession(projectId: string, sessionId: string): Promise<boolean> {
  await init();
  const count = await execute("UPDATE auth_refresh_tokens SET revoked = TRUE WHERE project_id = $1 AND id = $2", [projectId, sessionId]);
  return count > 0;
}

function rowToRT(row: any): RefreshTokenRecord {
  return {
    id: row.id, token: row.token, userId: row.user_id,
    createdAt: Number(row.created_at), expiresAt: Number(row.expires_at),
    revoked: row.revoked, ip: row.ip, userAgent: row.user_agent, replacedBy: row.replaced_by,
  };
}

// ---------- OAuth clients ----------

export async function listOAuthClients(projectId: string): Promise<OAuthClient[]> {
  await init();
  const rows = await query<any>("SELECT * FROM auth_oauth_clients WHERE project_id = $1 ORDER BY created_at DESC", [projectId]);
  return rows.map(r => ({
    id: r.id, clientId: r.client_id, clientSecret: r.client_secret,
    name: r.name, redirectUris: r.redirect_uris, allowedScopes: r.allowed_scopes,
    createdAt: Number(r.created_at),
  }));
}

export async function addOAuthClient(projectId: string, client: OAuthClient): Promise<OAuthClient> {
  await init();
  await execute(
    `INSERT INTO auth_oauth_clients (id, project_id, client_id, client_secret, name, redirect_uris, allowed_scopes, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [client.id, projectId, client.clientId, client.clientSecret, client.name,
     JSON.stringify(client.redirectUris), JSON.stringify(client.allowedScopes), client.createdAt]
  );
  return client;
}

export async function getOAuthClientByClientId(projectId: string, clientId: string): Promise<OAuthClient | null> {
  await init();
  const row = await queryOne<any>(
    "SELECT * FROM auth_oauth_clients WHERE project_id = $1 AND client_id = $2",
    [projectId, clientId]
  );
  if (!row) return null;
  return { id: row.id, clientId: row.client_id, clientSecret: row.client_secret, name: row.name, redirectUris: row.redirect_uris, allowedScopes: row.allowed_scopes, createdAt: Number(row.created_at) };
}

export async function deleteOAuthClient(projectId: string, id: string): Promise<boolean> {
  await init();
  const count = await execute("DELETE FROM auth_oauth_clients WHERE project_id = $1 AND id = $2", [projectId, id]);
  return count > 0;
}

// ---------- OAuth auth codes ----------

export async function addAuthCode(projectId: string, code: OAuthAuthCode): Promise<OAuthAuthCode> {
  await init();
  await execute(
    `INSERT INTO auth_oauth_codes (code, project_id, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at, used, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [code.code, projectId, code.clientId, code.userId, code.redirectUri, code.scope,
     code.codeChallenge ?? null, code.codeChallengeMethod ?? null, code.expiresAt, code.used, code.createdAt]
  );
  return code;
}

export async function consumeAuthCode(projectId: string, code: string): Promise<OAuthAuthCode | null> {
  await init();
  const row = await queryOne<any>(
    "UPDATE auth_oauth_codes SET used = TRUE WHERE project_id = $1 AND code = $2 AND used = FALSE AND expires_at > $3 RETURNING *",
    [projectId, code, Date.now()]
  );
  if (!row) return null;
  return {
    code: row.code, clientId: row.client_id, userId: row.user_id,
    redirectUri: row.redirect_uri, scope: row.scope,
    codeChallenge: row.code_challenge, codeChallengeMethod: row.code_challenge_method,
    expiresAt: Number(row.expires_at), used: true, createdAt: Number(row.created_at),
  };
}

// ---------- Audit Logs ----------

export async function appendAuditLog(projectId: string, entry: AuditLogEntry): Promise<void> {
  await init();
  await execute(
    `INSERT INTO auth_audit_logs (id, project_id, timestamp, action, actor_id, actor_email, target_id, target_type, ip, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [entry.id, projectId, entry.timestamp, entry.action, entry.actorId, entry.actorEmail,
     entry.targetId, entry.targetType, entry.ip, entry.userAgent, JSON.stringify(entry.metadata)]
  );
}

export async function getAuditLogs(
  projectId: string,
  opts: { limit?: number; offset?: number; action?: string; actorId?: string } = {}
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  await init();
  let where = "project_id = $1";
  const params: any[] = [projectId];
  if (opts.action) { params.push(opts.action); where += ` AND action = $${params.length}`; }
  if (opts.actorId) { params.push(opts.actorId); where += ` AND actor_id = $${params.length}`; }
  const countRow = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM auth_audit_logs WHERE ${where}`, params);
  const total = parseInt(countRow?.count ?? "0", 10);
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const rows = await query<any>(
    `SELECT * FROM auth_audit_logs WHERE ${where} ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    entries: rows.map(r => ({
      id: r.id, projectId: r.project_id, timestamp: Number(r.timestamp),
      action: r.action, actorId: r.actor_id, actorEmail: r.actor_email,
      targetId: r.target_id, targetType: r.target_type, ip: r.ip,
      userAgent: r.user_agent, metadata: r.metadata ?? {},
    })),
    total,
  };
}
