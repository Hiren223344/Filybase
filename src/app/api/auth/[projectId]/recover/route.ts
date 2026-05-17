import { NextRequest } from "next/server";
import { AuthError } from "@/lib/auth/service";
import { getConfig, getUserByEmail, patchUser, appendAuditLog } from "@/lib/auth/store";
import { randomId, randomToken, signJwt, verifyJwt } from "@/lib/auth/crypto";
import { clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) { return handleOptions(req); }

/**
 * POST /api/auth/<projectId>/recover
 * Body: { email: string }
 * Generates a password recovery token (short-lived JWT) and returns it.
 * In production you'd email this; here we return it directly for dev convenience.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) throw new AuthError("invalid_request", "email is required", 400);

    const user = await getUserByEmail(projectId, email);
    // Always return success to prevent email enumeration
    if (!user) return json({ message: "If the email exists, a recovery link has been sent." }, { status: 200 }, req);

    const cfg = await getConfig(projectId);
    const token = signJwt(
      { sub: user.id, email: user.email, type: "recovery", aud: "recovery" },
      cfg.jwtSecret,
      600 // 10 minutes
    );

    await appendAuditLog(projectId, {
      id: randomId(), projectId, timestamp: Date.now(), action: "user.recovery_requested",
      actorId: user.id, actorEmail: user.email, targetId: user.id, targetType: "user",
      ip: clientIp(req), userAgent: userAgent(req), metadata: {},
    });

    // In a real system, send email with link containing this token.
    // For dev/testing, we return the token directly.
    return json({ message: "If the email exists, a recovery link has been sent.", recovery_token: token }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

/**
 * PUT /api/auth/<projectId>/recover
 * Body: { token: string, password: string }
 * Resets the password using the recovery token.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;
    if (!token || !password) throw new AuthError("invalid_request", "token and password required", 400);
    if (String(password).length < 8) throw new AuthError("weak_password", "Password must be at least 8 characters", 400);

    const cfg = await getConfig(projectId);
    let claims: { sub?: string; type?: string };
    try { claims = verifyJwt(token, cfg.jwtSecret); }
    catch { throw new AuthError("invalid_token", "Invalid or expired recovery token", 401); }

    if (claims.type !== "recovery" || !claims.sub) throw new AuthError("invalid_token", "Not a recovery token", 401);

    const { hashPassword } = await import("@/lib/auth/crypto");
    const updated = await patchUser(projectId, claims.sub, { passwordHash: hashPassword(password) });
    if (!updated) throw new AuthError("user_missing", "User not found", 404);

    await appendAuditLog(projectId, {
      id: randomId(), projectId, timestamp: Date.now(), action: "user.password_reset",
      actorId: claims.sub, actorEmail: updated.email, targetId: claims.sub, targetType: "user",
      ip: clientIp(req), userAgent: userAgent(req), metadata: {},
    });

    return json({ message: "Password updated successfully." }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
