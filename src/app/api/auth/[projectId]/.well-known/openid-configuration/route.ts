import { NextRequest } from "next/server";
import { getConfig } from "@/lib/auth/store";
import { errorResponse, handleOptions, json } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/**
 * OpenID Connect-ish discovery document so SDKs can auto-detect endpoints.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const cfg = await getConfig(projectId);
    const base = new URL(req.url);
    const issuer = `${base.origin}/api/auth/${projectId}`;
    return json(
      {
        issuer: cfg.jwtIssuer,
        base_url: issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/oauth/token`,
        userinfo_endpoint: `${issuer}/oauth/userinfo`,
        signup_endpoint: `${issuer}/signup`,
        signin_endpoint: `${issuer}/signin`,
        refresh_endpoint: `${issuer}/refresh`,
        signout_endpoint: `${issuer}/signout`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token", "password"],
        scopes_supported: ["openid", "profile", "email"],
        token_endpoint_auth_methods_supported: [
          "client_secret_post",
          "client_secret_basic",
          "none",
        ],
        code_challenge_methods_supported: ["S256", "plain"],
        id_token_signing_alg_values_supported: ["HS256"],
      },
      { status: 200 },
      req
    );
  } catch (err) {
    return errorResponse(err, req);
  }
}
