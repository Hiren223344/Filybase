// Shared HTTP helpers for the auth API routes.

import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "./service";
import { getConfig } from "./store";
import { verifyJwt } from "./crypto";

export function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, apikey, x-filybase-anon-key",
    "Access-Control-Max-Age": "86400",
  };
}

export function json(data: unknown, init: ResponseInit = {}, req?: NextRequest): NextResponse {
  const origin = req?.headers.get("origin") ?? undefined;
  return NextResponse.json(data, {
    ...init,
    headers: { ...corsHeaders(origin), ...(init.headers ?? {}) },
  });
}

export function errorResponse(err: unknown, req?: NextRequest): NextResponse {
  if (err instanceof AuthError) {
    return json(
      { error: err.code, error_description: err.message },
      { status: err.status },
      req
    );
  }
  const message = err instanceof Error ? err.message : "internal_error";
  return json(
    { error: "internal_error", error_description: message },
    { status: 500 },
    req
  );
}

export function handleOptions(req: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export function userAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent");
}

export function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const match = /^Bearer\s+(.+)$/i.exec(h.trim());
  return match ? match[1] : null;
}

export function apiKey(req: NextRequest): string | null {
  return req.headers.get("apikey") || req.headers.get("x-filybase-anon-key");
}

/**
 * Require service-role key from Authorization header.
 * This is how the dashboard and trusted backends hit admin endpoints.
 */
export async function requireServiceRole(
  req: NextRequest,
  projectId: string
): Promise<void> {
  const cfg = await getConfig(projectId);
  const token = bearer(req) ?? apiKey(req);
  if (!token) throw new AuthError("unauthorized", "Missing service role key", 401);
  if (token !== cfg.serviceRoleKey) {
    // Also allow the anon key + a valid JWT with role=service_role? Not needed here.
    throw new AuthError("unauthorized", "Invalid service role key", 401);
  }
}

/**
 * Require a valid user access token. Returns the JWT claims.
 */
export async function requireUser(
  req: NextRequest,
  projectId: string
): Promise<{ sub: string; email?: string; [k: string]: unknown }> {
  const cfg = await getConfig(projectId);
  const token = bearer(req);
  if (!token) throw new AuthError("unauthorized", "Missing access token", 401);
  try {
    return verifyJwt(token, cfg.jwtSecret);
  } catch (e) {
    throw new AuthError("invalid_token", (e as Error).message, 401);
  }
}
