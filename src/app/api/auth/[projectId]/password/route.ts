import { NextRequest } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth/service";
import { patchUser, appendAuditLog } from "@/lib/auth/store";
import { hashPassword, randomId, verifyPassword } from "@/lib/auth/crypto";
import { bearer, clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) { return handleOptions(req); }

/**
 * PUT /api/auth/<projectId>/password
 * Body: { currentPassword: string, newPassword: string }
 * Change password for the authenticated user.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) throw new AuthError("unauthorized", "Access token required", 401);
    const user = await getCurrentUser(projectId, token);
    const body = await req.json().catch(() => ({}));

    const { currentPassword, newPassword } = body;
    if (!newPassword || String(newPassword).length < 8) {
      throw new AuthError("weak_password", "New password must be at least 8 characters", 400);
    }

    // If user has a password, require current password
    if (user.passwordHash) {
      if (!currentPassword) throw new AuthError("invalid_request", "Current password required", 400);
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        throw new AuthError("invalid_credentials", "Current password is incorrect", 401);
      }
    }

    await patchUser(projectId, user.id, { passwordHash: hashPassword(newPassword) });

    await appendAuditLog(projectId, {
      id: randomId(), projectId, timestamp: Date.now(), action: "user.password_changed",
      actorId: user.id, actorEmail: user.email, targetId: user.id, targetType: "user",
      ip: clientIp(req), userAgent: userAgent(req), metadata: {},
    });

    return json({ message: "Password updated." }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
