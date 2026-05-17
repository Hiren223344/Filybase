'use client';
import React from 'react';

export default function OAuthDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">OAuth 2.1 Server</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Your FilyBase project acts as a full OAuth 2.1 identity provider with OpenID Connect support. Third-party applications can implement &quot;Sign in with YourApp&quot; using the standard authorization code flow with PKCE.</p>
      </div>

      <S title="Use Cases">
        <p className="text-sm text-zinc-400">Enable OAuth Server when you want to:</p>
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-1 mt-2">
          <li>Let third-party apps authenticate users from your platform</li>
          <li>Build a developer platform with &quot;Sign in with [YourApp]&quot;</li>
          <li>Authenticate AI agents and MCP servers</li>
          <li>Provide OpenID Connect federation for enterprise SSO</li>
          <li>Issue scoped tokens to mobile/desktop apps</li>
        </ul>
      </S>

      <S title="Endpoints">
        <Table headers={['Endpoint', 'URL']} rows={[
          ['Authorization', '/api/auth/<projectId>/oauth/authorize'],
          ['Token', '/api/auth/<projectId>/oauth/token'],
          ['UserInfo', '/api/auth/<projectId>/oauth/userinfo'],
          ['Client Management', '/api/auth/<projectId>/oauth/clients'],
          ['OIDC Discovery', '/api/auth/<projectId>/.well-known/openid-configuration'],
        ]} />
      </S>

      <S title="Registering OAuth Clients">
        <p className="text-sm text-zinc-400 mb-3">Before third-party apps can authenticate, register them as OAuth clients:</p>
        <Code title="POST /api/auth/<projectId>/oauth/clients">{`Authorization: Bearer <serviceRoleKey>

{
  "name": "My Third-Party App",
  "redirectUris": [
    "https://myapp.com/callback",
    "http://localhost:3000/callback"
  ],
  "scopes": ["openid", "profile", "email"]
}`}</Code>
        <Code title="Response 201 (client secret shown ONCE)">{`{
  "id": "abc123",
  "clientId": "cli_xK9mP2...",
  "clientSecret": "sec_7hG4nR...",   ← Store this securely!
  "name": "My Third-Party App",
  "redirectUris": ["https://myapp.com/callback", "http://localhost:3000/callback"],
  "allowedScopes": ["openid", "profile", "email"],
  "createdAt": 1778659496000
}`}</Code>
        <p className="text-xs text-zinc-500 mt-2">The client secret is only returned once at creation time. It&apos;s stored hashed — if lost, delete and recreate the client.</p>
      </S>

      <S title="Authorization Code Flow with PKCE">
        <p className="text-sm text-zinc-400 mb-3">The recommended flow for all clients (public and confidential):</p>

        <H3>Step 1: Generate PKCE Parameters (Client-Side)</H3>
        <Code>{`// Generate a random code_verifier (43-128 chars)
const verifier = generateRandomString(64)

// Create code_challenge = base64url(sha256(verifier))
const encoder = new TextEncoder()
const data = encoder.encode(verifier)
const hash = await crypto.subtle.digest('SHA-256', data)
const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
  .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')`}</Code>

        <H3>Step 2: Redirect User to Authorization Endpoint</H3>
        <Code>{`GET /api/auth/<projectId>/oauth/authorize
  ?client_id=cli_xK9mP2...
  &redirect_uri=https://myapp.com/callback
  &response_type=code
  &scope=openid profile email
  &state=random-csrf-token
  &code_challenge=<challenge>
  &code_challenge_method=S256
Authorization: Bearer <user's access token>`}</Code>
        <p className="text-xs text-zinc-500 mt-2">The user must be authenticated (have a valid FilyBase session). On success, they&apos;re redirected to redirect_uri with ?code=...&state=...</p>

        <H3>Step 3: Exchange Code for Tokens</H3>
        <Code title="POST /api/auth/<projectId>/oauth/token">{`Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "ac_7hG4nR...",
  "redirect_uri": "https://myapp.com/callback",
  "client_id": "cli_xK9mP2...",
  "code_verifier": "<original verifier>"
}

// For confidential clients (without PKCE), use client_secret instead:
{
  "grant_type": "authorization_code",
  "code": "ac_7hG4nR...",
  "redirect_uri": "https://myapp.com/callback",
  "client_id": "cli_xK9mP2...",
  "client_secret": "sec_7hG4nR..."
}`}</Code>
        <Code title="Response 200">{`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "fb_rt_...",
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJIUzI1NiIs..."  // Only if scope includes "openid"
}`}</Code>

        <H3>Step 4: Get User Info</H3>
        <Code title="GET /api/auth/<projectId>/oauth/userinfo">{`Authorization: Bearer <access_token from step 3>

// Response:
{
  "sub": "dyhSQ0svAns1s-37akpJuA",
  "email": "user@example.com",
  "email_verified": true,
  "name": "Jane Doe",
  "picture": null,
  "preferred_username": "user@example.com"
}`}</Code>
      </S>

      <S title="Refresh Token Grant">
        <Code title="POST /api/auth/<projectId>/oauth/token">{`{
  "grant_type": "refresh_token",
  "refresh_token": "fb_rt_..."
}

// Response: New access_token + refresh_token pair`}</Code>
      </S>

      <S title="Client Authentication Methods">
        <Table headers={['Method', 'How', 'Use Case']} rows={[
          ['None (PKCE)', 'Only client_id + code_verifier in body', 'Public clients (SPAs, mobile apps)'],
          ['client_secret_post', 'client_id + client_secret in request body', 'Server-side apps'],
          ['client_secret_basic', 'Authorization: Basic base64(client_id:client_secret)', 'Server-side apps (RFC default)'],
        ]} />
      </S>

      <S title="Scopes">
        <Table headers={['Scope', 'Data Included']} rows={[
          ['openid', 'ID token with sub claim (required for OIDC)'],
          ['profile', 'name, picture/avatar in userinfo'],
          ['email', 'email, email_verified in userinfo'],
          ['phone', 'phone number in userinfo'],
        ]} />
      </S>

      <S title="ID Token Claims">
        <p className="text-sm text-zinc-400 mb-3">When the openid scope is requested, an ID token JWT is included:</p>
        <Code>{`{
  "sub": "user-id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "Jane Doe",
  "aud": "cli_xK9mP2...",    // client_id
  "iss": "filybase:myproject",
  "iat": 1778659496,
  "exp": 1778663096
}`}</Code>
      </S>

      <S title="OIDC Discovery">
        <Code title="GET /api/auth/<projectId>/.well-known/openid-configuration">{`{
  "issuer": "filybase:myproject",
  "authorization_endpoint": ".../oauth/authorize",
  "token_endpoint": ".../oauth/token",
  "userinfo_endpoint": ".../oauth/userinfo",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "scopes_supported": ["openid", "profile", "email"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic", "none"],
  "code_challenge_methods_supported": ["S256", "plain"],
  "id_token_signing_alg_values_supported": ["HS256"]
}`}</Code>
      </S>

      <S title="Consent Page">
        <p className="text-sm text-zinc-400 mb-3">When using the GET authorize endpoint (browser redirect), users see a consent page at /oauth/consent where they approve or deny the request. The page shows:</p>
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-1">
          <li>Which app is requesting access</li>
          <li>What scopes/permissions are requested</li>
          <li>Where they&apos;ll be redirected</li>
          <li>Approve / Deny buttons</li>
        </ul>
      </S>

      <S title="Security Considerations">
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-1">
          <li>Always use PKCE for public clients (SPAs, mobile apps)</li>
          <li>Authorization codes expire after 10 minutes and can only be used once</li>
          <li>Redirect URIs must exactly match what&apos;s registered (no wildcards)</li>
          <li>Store client secrets server-side only — never in client code</li>
          <li>Use the state parameter to prevent CSRF attacks</li>
          <li>Validate the state parameter matches what you sent</li>
        </ul>
      </S>
    </div>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h2 className="text-base font-medium text-white border-b border-zinc-800 pb-2">{title}</h2>{children}</section>;
}
function H3({ children }: { children: React.ReactNode }) { return <h3 className="text-sm font-medium text-emerald-400 mt-4 mb-2">{children}</h3>; }
function Code({ title, children }: { title?: string; children: string }) {
  return <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">{title && <div className="px-4 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-500">{title}</div>}<pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto leading-relaxed whitespace-pre">{children}</pre></div>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto border border-zinc-800 rounded-lg"><table className="w-full text-xs"><thead><tr className="bg-zinc-900 border-b border-zinc-800">{headers.map(h => <th key={h} className="px-3 py-2 text-left text-zinc-500 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800/50">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 text-zinc-300">{c}</td>)}</tr>)}</tbody></table></div>;
}
