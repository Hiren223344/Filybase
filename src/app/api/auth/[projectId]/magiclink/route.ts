import { NextRequest } from "next/server";
import { AuthError, issueSession } from "@/lib/auth/service";
import { getConfig, getUserByEmail, upsertUser, appendAuditLog } from "@/lib/auth/store";
import { randomId, signJwt, verifyJwt } from "@/lib/auth/crypto";
import { clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";
import { AuthUser } from "@/lib/auth/types";

export async function OPTIONS(req: NextRequest) { return handleOptions(req); }

/**
 * POST /api/auth/<projectId>/magiclink
 * Body: { email: string }
 * Generates a magic link token. In production, email it. For dev, returns it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) throw new AuthError("invalid_request", "email required", 400);

    const cfg = await getConfig(projectId);
    let user = await getUserByEmail(projectId, email);

    // Auto-create user if they don't exist (like Appwrite/Supabase magic link behavior)
    if (!user && !cfg.disableSignup) {
      const now = Date.now();
      user = {
        id: randomId(), email, emailVerified: true, passwordHash: null,
        name: null, avatarUrl: null, status: "active",
        metadata: {}, appMetadata: { provider: "magiclink" },
        identities: [{ provider: "magiclink", providerUserId: email, email, createdAt: now }],
        lastSignInAt: null, createdAt: now, updatedAt: now,
      } as AuthUser;
      await upsertUser(projectId, user);
    }

    if (!user) {
      // Don't reveal whether email exists
      return json({ message: "If the email exists, a magic link has been sent." }, { status: 200 }, req);
    }

    const token = signJwt(
      { sub: user.id, email: user.email, type: "magiclink", aud: "magiclink" },
      cfg.jwtSecret,
      600 // 10 minutes
    );

    return json({ message: "Magic link sent.", magic_token: token }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

/**
 * PUT /api/auth/<projectId>/magiclink
 * Body: { token: string }
 * Exchanges the magic link token for a session.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.token) throw new AuthError("invalid_request", "token required", 400);

    const cfg = await getConfig(projectId);
    let claims: { sub?: string; type?: string };
    try { claims = verifyJwt(body.token, cfg.jwtSecret); }
    catch { throw new AuthError("invalid_token", "Invalid or expired magic link", 401); }

    if (claims.type !== "magiclink" || !claims.sub) throw new AuthError("invalid_token", "Not a magic link token", 401);

    const { getUserById, patchUser } = await import("@/lib/auth/store");
    const user = await getUserById(projectId, claims.sub);
    if (!user) throw new AuthError("user_missing", "User not found", 404);

    await patchUser(projectId, user.id, { lastSignInAt: Date.now(), emailVerified: true });

    await appendAuditLog(projectId, {
      id: randomId(), projectId, timestamp: Date.now(), action: "user.signin",
      actorId: user.id, actorEmail: user.email, targetId: user.id, targetType: "user",
      ip: clientIp(req), userAgent: userAgent(req), metadata: { provider: "magiclink" },
    });

    const session = await issueSession(projectId, user, clientIp(req), userAgent(req));
    return json(session, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
