import { NextRequest } from "next/server";
import { createClient, listClientsPublic, removeClient } from "@/lib/auth/oauth";
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
    const clients = await listClientsPublic(projectId);
    return json({ clients }, { status: 200 }, req);
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
    const created = await createClient({
      projectId,
      name: String(body.name ?? ""),
      redirectUris: Array.isArray(body.redirectUris) ? body.redirectUris : [],
      scopes: Array.isArray(body.scopes) ? body.scopes : undefined,
    });
    // NOTE: clientSecret is only visible in the response here; not stored in plaintext.
    return json(created, { status: 201 }, req);
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
    const ok = await removeClient(projectId, id);
    return json({ ok }, { status: ok ? 200 : 404 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
