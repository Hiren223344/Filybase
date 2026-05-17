// Minimal OAuth 2.0 authorization server for third-party integrations.
// Supported grant types: authorization_code (with optional PKCE), refresh_token.
//
// FilyBase projects host IDP themselves: each project is an issuer and can
// register client apps under /oauth/clients. The authorization endpoint
// requires the resource-owner session (an active FilyBase user) to approve.

import {
  addAuthCode,
  addOAuthClient,
  consumeAuthCode,
  deleteOAuthClient,
  getConfig,
  getOAuthClientByClientId,
  getUserById,
  listOAuthClients,
} from "./store";
import { AuthError, issueSession, refresh as refreshSession } from "./service";
import {
  hashSecret,
  randomId,
  randomToken,
  signJwt,
  verifyPkce,
  verifySecret,
} from "./crypto";
import { OAuthClient, Session } from "./types";

export interface CreateOAuthClientInput {
  projectId: string;
  name: string;
  redirectUris: string[];
  scopes?: string[];
}

export interface CreatedOAuthClient {
  id: string;
  clientId: string;
  clientSecret: string; // returned ONCE, in plaintext
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  createdAt: number;
}

export async function createClient(
  input: CreateOAuthClientInput
): Promise<CreatedOAuthClient> {
  if (!input.name.trim()) throw new AuthError("invalid_name", "Name is required", 400);
  if (!input.redirectUris.length) {
    throw new AuthError("invalid_redirects", "At least one redirect URI is required", 400);
  }
  for (const uri of input.redirectUris) {
    try {
      new URL(uri);
    } catch {
      throw new AuthError("invalid_redirect", `Invalid redirect URI: ${uri}`, 400);
    }
  }
  const id = randomId();
  const clientId = `cli_${randomToken(12)}`;
  const plainSecret = `sec_${randomToken(32)}`;
  const record: OAuthClient = {
    id,
    clientId,
    clientSecret: hashSecret(plainSecret),
    name: input.name.trim(),
    redirectUris: input.redirectUris,
    allowedScopes: input.scopes ?? ["openid", "profile", "email"],
    createdAt: Date.now(),
  };
  await addOAuthClient(input.projectId, record);
  return {
    id: record.id,
    clientId: record.clientId,
    clientSecret: plainSecret,
    name: record.name,
    redirectUris: record.redirectUris,
    allowedScopes: record.allowedScopes,
    createdAt: record.createdAt,
  };
}

export async function listClientsPublic(projectId: string): Promise<
  Array<Omit<OAuthClient, "clientSecret">>
> {
  const all = await listOAuthClients(projectId);
  return all.map(({ clientSecret: _s, ...rest }) => {
    void _s;
    return rest;
  });
}

export async function removeClient(projectId: string, id: string): Promise<boolean> {
  return deleteOAuthClient(projectId, id);
}

// ---------- authorize ----------

export interface AuthorizeInput {
  projectId: string;
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
  userId: string; // resource owner: must be an authenticated FilyBase user
}

export interface AuthorizeResult {
  redirectTo: string;
}

export async function authorize(input: AuthorizeInput): Promise<AuthorizeResult> {
  if (input.responseType !== "code") {
    throw new AuthError("unsupported_response_type", "Only response_type=code is supported", 400);
  }
  const client = await getOAuthClientByClientId(input.projectId, input.clientId);
  if (!client) throw new AuthError("invalid_client", "Unknown client_id", 400);
  if (!client.redirectUris.includes(input.redirectUri)) {
    throw new AuthError("invalid_redirect", "redirect_uri not registered for this client", 400);
  }
  const user = await getUserById(input.projectId, input.userId);
  if (!user) throw new AuthError("invalid_user", "User not found", 401);

  const code = `ac_${randomToken(24)}`;
  await addAuthCode(input.projectId, {
    code,
    clientId: input.clientId,
    userId: user.id,
    redirectUri: input.redirectUri,
    scope: input.scope ?? client.allowedScopes.join(" "),
    codeChallenge: input.codeChallenge ?? null,
    codeChallengeMethod: input.codeChallengeMethod ?? null,
    expiresAt: Date.now() + 10 * 60 * 1000,
    used: false,
    createdAt: Date.now(),
  });

  const url = new URL(input.redirectUri);
  url.searchParams.set("code", code);
  if (input.state) url.searchParams.set("state", input.state);
  return { redirectTo: url.toString() };
}

// ---------- token ----------

export interface TokenInput {
  projectId: string;
  grantType: string;
  code?: string;
  redirectUri?: string;
  clientId?: string;
  clientSecret?: string;
  codeVerifier?: string;
  refreshToken?: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token: string;
  scope?: string;
  id_token?: string;
}

export async function token(input: TokenInput): Promise<OAuthTokenResponse> {
  if (input.grantType === "refresh_token") {
    if (!input.refreshToken) {
      throw new AuthError("invalid_request", "refresh_token is required", 400);
    }
    const sess = await refreshSession(
      input.projectId,
      input.refreshToken,
      input.ip ?? null,
      input.userAgent ?? null
    );
    return sessionToOAuth(sess);
  }

  if (input.grantType !== "authorization_code") {
    throw new AuthError("unsupported_grant_type", `Unsupported grant: ${input.grantType}`, 400);
  }
  if (!input.code || !input.redirectUri || !input.clientId) {
    throw new AuthError("invalid_request", "Missing parameters", 400);
  }
  const client = await getOAuthClientByClientId(input.projectId, input.clientId);
  if (!client) throw new AuthError("invalid_client", "Unknown client", 401);

  // Public clients may omit the secret if PKCE is used; confidential clients must present it.
  const usingPkce = !!input.codeVerifier;
  if (!usingPkce) {
    if (!input.clientSecret || !verifySecret(input.clientSecret, client.clientSecret)) {
      throw new AuthError("invalid_client", "Invalid client secret", 401);
    }
  }

  const record = await consumeAuthCode(input.projectId, input.code);
  if (!record) throw new AuthError("invalid_grant", "Invalid or expired authorization code", 400);
  if (record.clientId !== input.clientId) {
    throw new AuthError("invalid_grant", "Authorization code issued for a different client", 400);
  }
  if (record.redirectUri !== input.redirectUri) {
    throw new AuthError("invalid_grant", "redirect_uri mismatch", 400);
  }
  if (record.codeChallenge) {
    if (!input.codeVerifier) {
      throw new AuthError("invalid_grant", "PKCE code_verifier required", 400);
    }
    if (
      !verifyPkce(
        input.codeVerifier,
        record.codeChallenge,
        record.codeChallengeMethod ?? "S256"
      )
    ) {
      throw new AuthError("invalid_grant", "PKCE verification failed", 400);
    }
  }

  const user = await getUserById(input.projectId, record.userId);
  if (!user) throw new AuthError("invalid_grant", "User no longer exists", 400);

  const sess = await issueSession(
    input.projectId,
    user,
    input.ip ?? null,
    input.userAgent ?? null
  );

  // OpenID-ish id_token when scope includes openid
  let idToken: string | undefined;
  if (record.scope.split(/\s+/).includes("openid")) {
    const cfg = await getConfig(input.projectId);
    idToken = signJwt(
      {
        sub: user.id,
        email: user.email,
        email_verified: user.emailVerified,
        name: user.name ?? undefined,
        aud: client.clientId,
        iss: cfg.jwtIssuer,
      },
      cfg.jwtSecret,
      cfg.jwtAccessTtlSec
    );
  }

  return {
    access_token: sess.accessToken,
    token_type: "bearer",
    expires_in: sess.expiresIn,
    refresh_token: sess.refreshToken,
    scope: record.scope,
    id_token: idToken,
  };
}

function sessionToOAuth(s: Session): OAuthTokenResponse {
  return {
    access_token: s.accessToken,
    token_type: "bearer",
    expires_in: s.expiresIn,
    refresh_token: s.refreshToken,
  };
}
