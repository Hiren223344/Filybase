// Auth service: the orchestration layer that the HTTP routes call into.

import {
  addRefreshToken,
  appendAuditLog,
  findRefreshToken,
  getConfig,
  getUserByEmail,
  getUserById,
  patchUser,
  revokeRefreshToken,
  rotateRefreshToken,
  upsertUser,
} from "./store";
import { AuthUser, AuditLogEntry, Session, toPublicUser } from "./types";
import {
  hashPassword,
  randomId,
  randomToken,
  signJwt,
  verifyJwt,
  verifyPassword,
} from "./crypto";

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) throw new AuthError("invalid_email", "Invalid email address", 400);
  return clean;
}

function validatePassword(password: string): void {
  if (typeof password !== "string" || password.length < 8) {
    throw new AuthError("weak_password", "Password must be at least 8 characters", 400);
  }
}

export interface SignUpInput {
  projectId: string;
  email: string;
  password: string;
  name?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function signUp(input: SignUpInput): Promise<Session> {
  const cfg = await getConfig(input.projectId);
  if (cfg.disableSignup) {
    throw new AuthError("signup_disabled", "Signup is disabled for this project", 403);
  }
  const email = validateEmail(input.email);
  validatePassword(input.password);

  const existing = await getUserByEmail(input.projectId, email);
  if (existing) {
    throw new AuthError("user_exists", "A user with that email already exists", 409);
  }

  const now = Date.now();
  const user: AuthUser = {
    id: randomId(),
    email,
    emailVerified: !cfg.requireEmailConfirmation,
    passwordHash: hashPassword(input.password),
    name: input.name?.trim() || null,
    avatarUrl: null,
    status: "active",
    metadata: input.metadata ?? {},
    appMetadata: { provider: "email" },
    identities: [
      {
        provider: "email",
        providerUserId: email,
        email,
        createdAt: now,
      },
    ],
    lastSignInAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await upsertUser(input.projectId, user);

  // Audit log
  await appendAuditLog(input.projectId, {
    id: randomId(),
    projectId: input.projectId,
    timestamp: now,
    action: "user.signup",
    actorId: user.id,
    actorEmail: user.email,
    targetId: user.id,
    targetType: "user",
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    metadata: { provider: "email" },
  });

  return issueSession(input.projectId, user, input.ip ?? null, input.userAgent ?? null);
}

export interface SignInInput {
  projectId: string;
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}

export async function signIn(input: SignInInput): Promise<Session> {
  const email = validateEmail(input.email);
  const user = await getUserByEmail(input.projectId, email);
  if (!user || !user.passwordHash) {
    throw new AuthError("invalid_credentials", "Invalid email or password", 401);
  }
  if (user.status === "banned") {
    throw new AuthError("user_banned", "This account has been disabled", 403);
  }
  if (!verifyPassword(input.password, user.passwordHash)) {
    // Audit failed login
    await appendAuditLog(input.projectId, {
      id: randomId(),
      projectId: input.projectId,
      timestamp: Date.now(),
      action: "user.signin_failed",
      actorId: null,
      actorEmail: email,
      targetId: user.id,
      targetType: "user",
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: { reason: "invalid_password" },
    });
    throw new AuthError("invalid_credentials", "Invalid email or password", 401);
  }
  const updated = await patchUser(input.projectId, user.id, { lastSignInAt: Date.now() });

  // Audit successful login
  await appendAuditLog(input.projectId, {
    id: randomId(),
    projectId: input.projectId,
    timestamp: Date.now(),
    action: "user.signin",
    actorId: user.id,
    actorEmail: user.email,
    targetId: user.id,
    targetType: "user",
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    metadata: { provider: "email" },
  });

  return issueSession(
    input.projectId,
    updated ?? user,
    input.ip ?? null,
    input.userAgent ?? null
  );
}

export async function issueSession(
  projectId: string,
  user: AuthUser,
  ip: string | null,
  userAgent: string | null
): Promise<Session> {
  const cfg = await getConfig(projectId);
  const sessionId = randomId();
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJwt(
    {
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      iss: cfg.jwtIssuer,
      session_id: sessionId,
      app_metadata: user.appMetadata,
      user_metadata: user.metadata,
    },
    cfg.jwtSecret,
    cfg.jwtAccessTtlSec
  );
  const refreshToken = `fb_rt_${randomToken(32)}`;
  const expiresAt = Date.now() + cfg.refreshTokenTtlSec * 1000;
  await addRefreshToken(projectId, {
    id: sessionId,
    token: refreshToken,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt,
    revoked: false,
    ip,
    userAgent,
  });
  return {
    accessToken,
    tokenType: "bearer",
    expiresIn: cfg.jwtAccessTtlSec,
    expiresAt: now + cfg.jwtAccessTtlSec,
    refreshToken,
    user: toPublicUser(user),
  };
}

export async function refresh(
  projectId: string,
  refreshToken: string,
  ip: string | null,
  userAgent: string | null
): Promise<Session> {
  const rt = await findRefreshToken(projectId, refreshToken);
  if (!rt) throw new AuthError("invalid_refresh", "Refresh token not found", 401);
  if (rt.revoked) throw new AuthError("revoked", "Refresh token has been revoked", 401);
  if (rt.expiresAt < Date.now()) {
    throw new AuthError("expired", "Refresh token expired", 401);
  }
  const user = await getUserById(projectId, rt.userId);
  if (!user) throw new AuthError("user_missing", "User no longer exists", 404);

  const cfg = await getConfig(projectId);
  const sessionId = randomId();
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJwt(
    {
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      iss: cfg.jwtIssuer,
      session_id: sessionId,
    },
    cfg.jwtSecret,
    cfg.jwtAccessTtlSec
  );
  const nextToken = `fb_rt_${randomToken(32)}`;
  const nextRecord = {
    id: sessionId,
    token: nextToken,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + cfg.refreshTokenTtlSec * 1000,
    revoked: false,
    ip,
    userAgent,
  };
  await rotateRefreshToken(projectId, refreshToken, nextRecord);

  return {
    accessToken,
    tokenType: "bearer",
    expiresIn: cfg.jwtAccessTtlSec,
    expiresAt: now + cfg.jwtAccessTtlSec,
    refreshToken: nextToken,
    user: toPublicUser(user),
  };
}

export async function signOut(projectId: string, refreshToken: string): Promise<void> {
  await revokeRefreshToken(projectId, refreshToken);
}

export async function getCurrentUser(
  projectId: string,
  accessToken: string
): Promise<AuthUser> {
  const cfg = await getConfig(projectId);
  let claims: { sub?: string };
  try {
    claims = verifyJwt(accessToken, cfg.jwtSecret);
  } catch (err) {
    throw new AuthError("invalid_token", (err as Error).message || "invalid token", 401);
  }
  if (!claims.sub) throw new AuthError("invalid_token", "Missing subject", 401);
  const user = await getUserById(projectId, claims.sub);
  if (!user) throw new AuthError("user_missing", "User no longer exists", 404);
  return user;
}
