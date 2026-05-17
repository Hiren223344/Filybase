import { NextRequest } from "next/server";
import { getAuditLogs } from "@/lib/auth/store";
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
    const url = req.nextUrl;
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const action = url.searchParams.get("action") ?? undefined;
    const actorId = url.searchParams.get("actorId") ?? undefined;
    const { entries, total } = await getAuditLogs(projectId, { limit, offset, action, actorId });
    return json({ entries, total, limit, offset }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
