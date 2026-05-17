import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/auth/oauth";
import { bearer, errorResponse, handleOptions, json } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/service";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/**
 * GET /api/auth/<projectId>/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=...&state=...&code_challenge=...&code_challenge_method=S256
 *
 * The caller must be an authenticated end-user; we accept either a Bearer
 * access token or a FilyBase session cookie (not used yet).
 * On success the user-agent is redirected to `redirect_uri?code=...&state=...`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) {
      return json(
        {
          error: "login_required",
          error_description:
            "User must authenticate before OAuth authorization. POST /signin first and pass the access token.",
        },
        { status: 401 },
        req
      );
    }
    const user = await getCurrentUser(projectId, token);
    const url = req.nextUrl;
    const result = await authorize({
      projectId,
      clientId: url.searchParams.get("client_id") ?? "",
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
      responseType: url.searchParams.get("response_type") ?? "code",
      scope: url.searchParams.get("scope") ?? undefined,
      state: url.searchParams.get("state") ?? undefined,
      codeChallenge: url.searchParams.get("code_challenge") ?? undefined,
      codeChallengeMethod:
        (url.searchParams.get("code_challenge_method") as "S256" | "plain" | null) ?? undefined,
      userId: user.id,
    });
    return NextResponse.redirect(result.redirectTo, { status: 302 });
  } catch (err) {
    return errorResponse(err, req);
  }
}

/**
 * POST variant for programmatic grant without redirect (returns the final URL).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) {
      return json({ error: "login_required" }, { status: 401 }, req);
    }
    const user = await getCurrentUser(projectId, token);
    const body = await req.json().catch(() => ({}));
    const result = await authorize({
      projectId,
      clientId: String(body.client_id ?? ""),
      redirectUri: String(body.redirect_uri ?? ""),
      responseType: String(body.response_type ?? "code"),
      scope: body.scope,
      state: body.state,
      codeChallenge: body.code_challenge,
      codeChallengeMethod: body.code_challenge_method,
      userId: user.id,
    });
    return json(result, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
