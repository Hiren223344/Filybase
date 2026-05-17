import { NextRequest } from "next/server";
import { getConfig, updateConfig } from "@/lib/auth/store";
import { bearer, errorResponse, handleOptions, json, requireServiceRole } from "@/lib/auth/http";

function redactConfig<T extends { jwtSecret?: string; providers: Record<string, { clientSecret?: string }> }>(cfg: T): T {
  const providers = Object.fromEntries(
    Object.entries(cfg.providers).map(([k, v]) => [
      k,
      { ...v, clientSecret: v.clientSecret ? "***redacted***" : undefined },
    ])
  );
  return { ...cfg, jwtSecret: "***redacted***", providers } as T;
}

/**
 * Dashboard bootstrap: allow same-origin requests with the special
 * `__dashboard__` bearer token. This lets the dashboard fetch the config
 * (including the service role key) on first load without a chicken-and-egg
 * problem. Only works for same-origin (Referer/Origin check).
 */
function isDashboardRequest(req: NextRequest): boolean {
  const token = bearer(req);
  if (token !== "__dashboard__") return false;
  const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  const reqHost = new URL(req.url).origin;
  return origin.startsWith(reqHost);
}

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    if (!isDashboardRequest(req)) {
      await requireServiceRole(req, projectId);
    }
    const cfg = await getConfig(projectId);
    return json(redactConfig(cfg), { status: 200 }, req);
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
    await requireServiceRole(req, projectId);
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body.disableSignup === "boolean") patch.disableSignup = body.disableSignup;
    if (typeof body.requireEmailConfirmation === "boolean") {
      patch.requireEmailConfirmation = body.requireEmailConfirmation;
    }
    if (typeof body.siteUrl === "string") patch.siteUrl = body.siteUrl;
    if (Array.isArray(body.allowedRedirects)) patch.allowedRedirects = body.allowedRedirects;
    if (typeof body.jwtAccessTtlSec === "number") patch.jwtAccessTtlSec = body.jwtAccessTtlSec;
    if (typeof body.refreshTokenTtlSec === "number") patch.refreshTokenTtlSec = body.refreshTokenTtlSec;
    if (body.providers && typeof body.providers === "object") patch.providers = body.providers;
    const updated = await updateConfig(projectId, patch);
    return json(redactConfig(updated), { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
