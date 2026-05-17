import { NextRequest } from "next/server";
import {
  deleteUser,
  listUsers,
  upsertUser,
} from "@/lib/auth/store";
import {
  errorResponse,
  handleOptions,
  json,
  requireServiceRole,
} from "@/lib/auth/http";
import { AuthUser, toPublicUser } from "@/lib/auth/types";
import { hashPassword, randomId } from "@/lib/auth/crypto";

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
    const search = url.searchParams.get("q") ?? undefined;
    const { users, total } = await listUsers(projectId, { limit, offset, search });
    return json(
      { users: users.map(toPublicUser), total, limit, offset },
      { status: 200 },
      req
    );
  } catch (err) {
    return errorResponse(err, req);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    await requireServiceRole(req, projectId);
    const body = await req.json().catch(() => ({}));
    if (!body.email) {
      return json({ error: "invalid_request", error_description: "email required" }, { status: 400 }, req);
    }
    const now = Date.now();
    const user: AuthUser = {
      id: randomId(),
      email: String(body.email).toLowerCase(),
      emailVerified: Boolean(body.emailVerified ?? true),
      passwordHash: body.password ? hashPassword(String(body.password)) : null,
      name: body.name ?? null,
      avatarUrl: null,
      status: body.status ?? "active",
      metadata: body.metadata ?? {},
      appMetadata: { provider: body.password ? "email" : "admin" },
      identities: [],
      lastSignInAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await upsertUser(projectId, user);
    return json(toPublicUser(user), { status: 201 }, req);
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
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return json({ error: "invalid_request" }, { status: 400 }, req);
    const ok = await deleteUser(projectId, id);
    return json({ ok }, { status: ok ? 200 : 404 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
