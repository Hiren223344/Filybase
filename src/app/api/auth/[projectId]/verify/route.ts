import { NextRequest } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth/service";
import { getConfig, getUserById, patchUser, appendAuditLog } from "@/lib/auth/store";
import { randomId, signJwt, verifyJwt } from "@/lib/auth/crypto";
import { bearer, clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) { return handleOptions(req); }

/**
 * POST /api/auth/<projectId>/verify
 * Sends a verification token for the current user's email.
 * Requires Bearer access token.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) throw new AuthError("unauthorized", "Access token required", 401);
    const user = await getCurrentUser(projectId, token);
    if (user.emailVerified) return json({ message: "Email already verified." }, { status: 200 }, req);

    const cfg = await getConfig(projectId);
    const verifyToken = signJwt(
      { sub: user.id, email: user.email, type: "email_verify", aud: "verify" },
      cfg.jwtSecret,
      3600 // 1 hour
    );

    // In production: send email. For dev: return token.
    return json({ message: "Verification email sent.", verify_token: verifyToken }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

/**
 * PUT /api/auth/<projectId>/verify
 * Body: { token: string }
 * Confirms email verification.
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
    catch { throw new AuthError("invalid_token", "Invalid or expired verification token", 401); }

    if (claims.type !== "email_verify" || !claims.sub) throw new AuthError("invalid_token", "Not a verification token", 401);

    const updated = await patchUser(projectId, claims.sub, { emailVerified: true });
    if (!updated) throw new AuthError("user_missing", "User not found", 404);

    await appendAuditLog(projectId, {
      id: randomId(), projectId, timestamp: Date.now(), action: "user.email_verified",
      actorId: claims.sub, actorEmail: updated.email, targetId: claims.sub, targetType: "user",
      ip: clientIp(req), userAgent: userAgent(req), metadata: {},
    });

    return json({ message: "Email verified.", user: { id: updated.id, email: updated.email, emailVerified: true } }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
