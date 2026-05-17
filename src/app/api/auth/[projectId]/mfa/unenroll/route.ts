import { NextRequest } from "next/server";
import { bearer, clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/service";
import { patchUser, appendAuditLog } from "@/lib/auth/store";
import { randomId } from "@/lib/auth/crypto";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/**
 * POST /api/auth/<projectId>/mfa/unenroll
 * Body: { factorId }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) return json({ error: "unauthorized" }, { status: 401 }, req);

    const user = await getCurrentUser(projectId, token);
    const body = await req.json().catch(() => ({}));
    const factorId = String(body.factorId ?? "");

    if (!factorId) {
      return json({ error: "invalid_request", error_description: "factorId is required" }, { status: 400 }, req);
    }

    const factors = (user.appMetadata.mfaFactors as Array<{ id: string }> | undefined) ?? [];
    const filtered = factors.filter((f) => f.id !== factorId);
    if (filtered.length === factors.length) {
      return json({ error: "factor_not_found" }, { status: 404 }, req);
    }

    await patchUser(projectId, user.id, {
      appMetadata: { ...user.appMetadata, mfaFactors: filtered },
    });

    await appendAuditLog(projectId, {
      id: randomId(),
      projectId,
      timestamp: Date.now(),
      action: "mfa.factor_unenrolled",
      actorId: user.id,
      actorEmail: user.email,
      targetId: factorId,
      targetType: "mfa_factor",
      ip: clientIp(req),
      userAgent: userAgent(req),
      metadata: {},
    });

    return json({ success: true }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
