import { NextRequest } from "next/server";
import { bearer, errorResponse, handleOptions, json } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/service";
import { getOAuthClientByClientId } from "@/lib/auth/store";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/**
 * GET /api/auth/<projectId>/oauth/consent?authorization_id=<id>&client_id=<cid>&scope=<scope>&redirect_uri=<uri>&state=<state>
 *
 * Returns the authorization details for the consent screen to render.
 * The user must be authenticated.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) {
      return json({ error: "login_required", error_description: "User must be authenticated" }, { status: 401 }, req);
    }

    const user = await getCurrentUser(projectId, token);
    const url = req.nextUrl;
    const clientId = url.searchParams.get("client_id") ?? "";
    const scope = url.searchParams.get("scope") ?? "openid profile email";
    const redirectUri = url.searchParams.get("redirect_uri") ?? "";
    const state = url.searchParams.get("state") ?? "";

    const client = await getOAuthClientByClientId(projectId, clientId);
    if (!client) {
      return json({ error: "invalid_client", error_description: "Unknown client_id" }, { status: 400 }, req);
    }

    return json(
      {
        client: {
          id: client.id,
          clientId: client.clientId,
          name: client.name,
          redirectUris: client.redirectUris,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        scope,
        redirectUri,
        state,
        scopes: scope.split(/\s+/).filter(Boolean),
      },
      { status: 200 },
      req
    );
  } catch (err) {
    return errorResponse(err, req);
  }
}
