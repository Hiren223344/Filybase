import { NextRequest } from "next/server";
import { token } from "@/lib/auth/oauth";
import { clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/**
 * POST /api/auth/<projectId>/oauth/token
 *
 * Accepts either application/x-www-form-urlencoded (OAuth default) or
 * application/json for convenience.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries()) body[k] = String(v);
    }

    // HTTP Basic for confidential clients
    const authHeader = req.headers.get("authorization");
    if (authHeader && /^Basic\s+/i.test(authHeader)) {
      try {
        const decoded = Buffer.from(authHeader.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
        const idx = decoded.indexOf(":");
        if (idx > 0) {
          body.client_id = body.client_id ?? decoded.slice(0, idx);
          body.client_secret = body.client_secret ?? decoded.slice(idx + 1);
        }
      } catch {
        /* ignore decode errors, fall through */
      }
    }

    const response = await token({
      projectId,
      grantType: body.grant_type ?? "",
      code: body.code,
      redirectUri: body.redirect_uri,
      clientId: body.client_id,
      clientSecret: body.client_secret,
      codeVerifier: body.code_verifier,
      refreshToken: body.refresh_token,
      ip: clientIp(req),
      userAgent: userAgent(req),
    });
    return json(response, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
