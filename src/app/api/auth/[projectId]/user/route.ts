import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/service";
import { bearer, errorResponse, handleOptions, json } from "@/lib/auth/http";
import { patchUser } from "@/lib/auth/store";
import { toPublicUser } from "@/lib/auth/types";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) {
      return json({ error: "unauthorized" }, { status: 401 }, req);
    }
    const user = await getCurrentUser(projectId, token);
    return json(toPublicUser(user), { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) {
      return json({ error: "unauthorized" }, { status: 401 }, req);
    }
    const user = await getCurrentUser(projectId, token);
    const body = await req.json().catch(() => ({}));
    const patch: { name?: string | null; avatarUrl?: string | null; metadata?: Record<string, unknown> } = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.avatarUrl === "string") patch.avatarUrl = body.avatarUrl;
    if (body.metadata && typeof body.metadata === "object") patch.metadata = body.metadata;
    const updated = await patchUser(projectId, user.id, patch);
    return json(updated ? toPublicUser(updated) : toPublicUser(user), { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
