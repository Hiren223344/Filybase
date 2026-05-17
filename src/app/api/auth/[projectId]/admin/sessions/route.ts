import { NextRequest } from "next/server";
import { listActiveSessions, revokeSession, revokeAllUserTokens } from "@/lib/auth/store";
import { errorResponse, handleOptions, json, requireServiceRole } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    await requireServiceRole(req, projectId);
    const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const sessions = await listActiveSessions(projectId, userId);
    return json(
      {
        sessions: sessions.map((s) => ({
          id: s.id,
          userId: s.userId,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          ip: s.ip,
          userAgent: s.userAgent,
        })),
        total: sessions.length,
      },
      { status: 200 },
      req
    );
  } catch (err) {
    return errorResponse(err, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    await requireServiceRole(req, projectId);
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const userId = req.nextUrl.searchParams.get("userId");
    if (userId) {
      await revokeAllUserTokens(projectId, userId);
      return json({ ok: true, message: "All sessions revoked for user" }, { status: 200 }, req);
    }
    if (sessionId) {
      const ok = await revokeSession(projectId, sessionId);
      return json({ ok }, { status: ok ? 200 : 404 }, req);
    }
    return json({ error: "invalid_request", error_description: "Provide sessionId or userId" }, { status: 400 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
