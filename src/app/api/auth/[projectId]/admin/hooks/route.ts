import { NextRequest } from "next/server";
import { getConfig, updateConfig } from "@/lib/auth/store";
import { errorResponse, handleOptions, json, requireServiceRole } from "@/lib/auth/http";
import { AuthHookConfig } from "@/lib/auth/types";
import { randomId } from "@/lib/auth/crypto";

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
    const cfg = await getConfig(projectId);
    return json({ hooks: cfg.hooks ?? [] }, { status: 200 }, req);
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
    const cfg = await getConfig(projectId);
    const hook: AuthHookConfig = {
      id: randomId(),
      name: String(body.name ?? "Untitled Hook"),
      event: body.event ?? "post_signup",
      enabled: body.enabled !== false,
      uri: String(body.uri ?? ""),
      secret: String(body.secret ?? ""),
      createdAt: Date.now(),
    };
    const hooks = [...(cfg.hooks ?? []), hook];
    await updateConfig(projectId, { hooks } as Partial<typeof cfg>);
    return json(hook, { status: 201 }, req);
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
    const cfg = await getConfig(projectId);
    const hooks = (cfg.hooks ?? []).filter((h) => h.id !== id);
    await updateConfig(projectId, { hooks } as Partial<typeof cfg>);
    return json({ ok: true }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
