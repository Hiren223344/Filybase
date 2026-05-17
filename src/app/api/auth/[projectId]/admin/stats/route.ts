import { NextRequest } from "next/server";
import { countActiveSessions, listUsers } from "@/lib/auth/store";
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
    const { users, total } = await listUsers(projectId, { limit: 10_000, offset: 0 });
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = users.filter((u) => u.createdAt >= weekAgo).length;
    const activeSessions = await countActiveSessions(projectId);
    return json(
      { totalUsers: total, newThisWeek, activeSessions },
      { status: 200 },
      req
    );
  } catch (err) {
    return errorResponse(err, req);
  }
}
