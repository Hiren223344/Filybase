import { NextRequest } from "next/server";
import { deleteUser, getUserById, patchUser, revokeAllUserTokens } from "@/lib/auth/store";
import { errorResponse, handleOptions, json, requireServiceRole } from "@/lib/auth/http";
import { toPublicUser } from "@/lib/auth/types";
import { hashPassword } from "@/lib/auth/crypto";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  try {
    await requireServiceRole(req, projectId);
    const user = await getUserById(projectId, id);
    if (!user) return json({ error: "not_found" }, { status: 404 }, req);
    return json(toPublicUser(user), { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  try {
    await requireServiceRole(req, projectId);
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body.email === "string") patch.email = body.email.toLowerCase();
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.status === "string") patch.status = body.status;
    if (typeof body.emailVerified === "boolean") patch.emailVerified = body.emailVerified;
    if (body.metadata && typeof body.metadata === "object") patch.metadata = body.metadata;
    if (body.appMetadata && typeof body.appMetadata === "object") patch.appMetadata = body.appMetadata;
    if (typeof body.password === "string" && body.password.length >= 8) {
      patch.passwordHash = hashPassword(body.password);
    }
    const updated = await patchUser(projectId, id, patch);
    if (!updated) return json({ error: "not_found" }, { status: 404 }, req);
    if (body.revokeSessions === true) {
      await revokeAllUserTokens(projectId, id);
    }
    return json(toPublicUser(updated), { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  try {
    await requireServiceRole(req, projectId);
    const ok = await deleteUser(projectId, id);
    return json({ ok }, { status: ok ? 200 : 404 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
