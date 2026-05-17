'use client';

import React from 'react';

export default function AuthDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Authentication</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Complete authentication system with email/password, magic links, TOTP MFA, password recovery, email verification, and session management. All endpoints are project-scoped and return standard JSON responses.</p>
      </div>

      <S title="Base URL">
        <Code>{`https://your-domain.com/api/auth/<projectId>`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Replace &lt;projectId&gt; with your project&apos;s unique identifier. Each project has isolated users, sessions, and configuration.</p>
      </S>

      <S title="Authentication Headers">
        <p className="text-sm text-zinc-400 mb-3">Endpoints that require authentication accept a Bearer token in the Authorization header:</p>
        <Code>{`Authorization: Bearer <accessToken>`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Admin endpoints require the service role key instead of a user access token.</p>
      </S>

      <S title="Sign Up">
        <p className="text-sm text-zinc-400 mb-3">Create a new user account. Returns a full session (access token + refresh token + user object).</p>
        <Code title="POST /signup">{`{
  "email": "user@example.com",    // required, valid email
  "password": "mypassword123",    // required, min 8 characters
  "name": "Jane Doe",             // optional
  "metadata": { "plan": "free" }  // optional, arbitrary JSON
}`}</Code>
        <Code title="Response 200">{`{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "bearer",
  "expiresIn": 3600,
  "expiresAt": 1778663096,
  "refreshToken": "fb_rt_abc123...",
  "user": {
    "id": "dyhSQ0svAns1s-37akpJuA",
    "email": "user@example.com",
    "emailVerified": true,
    "name": "Jane Doe",
    "status": "active",
    "metadata": { "plan": "free" },
    "appMetadata": { "provider": "email" },
    "identities": [{ "provider": "email", "providerUserId": "user@example.com" }],
    "createdAt": 1778659496000,
    "updatedAt": 1778659496000
  }
}`}</Code>
        <H3>Error Responses</H3>
        <Table headers={['Status', 'Code', 'When']} rows={[
          ['400', 'invalid_email', 'Email format is invalid'],
          ['400', 'weak_password', 'Password shorter than 8 characters'],
          ['403', 'signup_disabled', 'Signup is disabled for this project'],
          ['409', 'user_exists', 'Email already registered'],
          ['429', 'rate_limit_exceeded', 'Too many signups from this IP'],
        ]} />
      </S>

      <S title="Sign In">
        <p className="text-sm text-zinc-400 mb-3">Authenticate with email and password. Returns same session format as signup.</p>
        <Code title="POST /signin">{`{
  "email": "user@example.com",
  "password": "mypassword123"
}`}</Code>
        <H3>Error Responses</H3>
        <Table headers={['Status', 'Code', 'When']} rows={[
          ['401', 'invalid_credentials', 'Wrong email or password'],
          ['403', 'user_banned', 'Account has been disabled by admin'],
          ['429', 'rate_limit_exceeded', '30 attempts per 15 minutes per IP'],
        ]} />
      </S>

      <S title="Sign Out">
        <p className="text-sm text-zinc-400 mb-3">Revoke a refresh token, ending that session.</p>
        <Code title="POST /signout">{`{ "refresh_token": "fb_rt_abc123..." }`}</Code>
        <Code title="Response 200">{`{ "ok": true }`}</Code>
      </S>

      <S title="Refresh Token">
        <p className="text-sm text-zinc-400 mb-3">Exchange a refresh token for a new access token + refresh token pair. The old refresh token is revoked (rotation).</p>
        <Code title="POST /refresh">{`{ "refresh_token": "fb_rt_abc123..." }`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Returns the same session format as signup/signin. The old refresh token cannot be reused.</p>
        <H3>Token Rotation</H3>
        <p className="text-sm text-zinc-400">Each refresh token can only be used once. When used, it&apos;s revoked and a new one is issued. If a revoked token is reused, it indicates potential token theft — the entire session family is invalidated.</p>
      </S>

      <S title="Get Current User">
        <p className="text-sm text-zinc-400 mb-3">Retrieve the authenticated user&apos;s profile.</p>
        <Code title="GET /user">{`Authorization: Bearer <accessToken>`}</Code>
        <Code title="Response 200">{`{
  "id": "dyhSQ0svAns1s-37akpJuA",
  "email": "user@example.com",
  "emailVerified": true,
  "name": "Jane Doe",
  "avatarUrl": null,
  "status": "active",
  "metadata": { "plan": "free" },
  "appMetadata": { "provider": "email" },
  "identities": [...],
  "lastSignInAt": 1778659496000,
  "createdAt": 1778659496000,
  "updatedAt": 1778659496000
}`}</Code>
      </S>

      <S title="Update User">
        <p className="text-sm text-zinc-400 mb-3">Update the authenticated user&apos;s profile fields.</p>
        <Code title="PATCH /user">{`Authorization: Bearer <accessToken>

{
  "name": "Jane Smith",
  "avatarUrl": "https://example.com/avatar.jpg",
  "metadata": { "plan": "pro", "theme": "dark" }
}`}</Code>
      </S>

      <S title="Change Password">
        <p className="text-sm text-zinc-400 mb-3">Change password for the authenticated user. Requires current password for verification.</p>
        <Code title="PUT /password">{`Authorization: Bearer <accessToken>

{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}`}</Code>
      </S>

      <S title="Password Recovery">
        <p className="text-sm text-zinc-400 mb-3">Two-step flow: request a recovery token, then use it to set a new password.</p>
        <Code title="Step 1: POST /recover">{`{ "email": "user@example.com" }

// Response (always 200 to prevent email enumeration):
{ "message": "If the email exists, a recovery link has been sent.", "recovery_token": "eyJ..." }`}</Code>
        <Code title="Step 2: PUT /recover">{`{
  "token": "eyJ...",       // from step 1 (or email link)
  "password": "newpass456" // min 8 characters
}

// Response:
{ "message": "Password updated successfully." }`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Recovery tokens expire after 10 minutes. In production, the token would be sent via email rather than returned in the response.</p>
      </S>

      <S title="Magic Link (Passwordless)">
        <p className="text-sm text-zinc-400 mb-3">Passwordless authentication via email link. If the email doesn&apos;t exist, a new account is created automatically.</p>
        <Code title="Step 1: POST /magiclink">{`{ "email": "user@example.com" }

// Response:
{ "message": "Magic link sent.", "magic_token": "eyJ..." }`}</Code>
        <Code title="Step 2: PUT /magiclink">{`{ "token": "eyJ..." }

// Response: Full session (same as signin)`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Magic link tokens expire after 10 minutes. Auto-creates users if signup is enabled.</p>
      </S>

      <S title="Email Verification">
        <p className="text-sm text-zinc-400 mb-3">Verify the user&apos;s email address ownership.</p>
        <Code title="Step 1: POST /verify (requires auth)">{`Authorization: Bearer <accessToken>

// Response:
{ "message": "Verification email sent.", "verify_token": "eyJ..." }`}</Code>
        <Code title="Step 2: PUT /verify">{`{ "token": "eyJ..." }

// Response:
{ "message": "Email verified.", "user": { "id": "...", "emailVerified": true } }`}</Code>
      </S>

      <S title="Multi-Factor Authentication (TOTP)">
        <p className="text-sm text-zinc-400 mb-3">Time-based One-Time Password (TOTP) using authenticator apps like Google Authenticator, Authy, or 1Password.</p>
        <H3>Enroll a TOTP Factor</H3>
        <Code title="POST /mfa (requires auth)">{`Authorization: Bearer <accessToken>

// Response:
{
  "secret": "JBSWY3DPEHPK3PXP",           // Base32 secret
  "otpauth_uri": "otpauth://totp/FilyBase:user@example.com?secret=...",
  "type": "totp"
}`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Display the otpauth_uri as a QR code for the user to scan with their authenticator app.</p>
        <H3>Verify Enrollment</H3>
        <Code title="PUT /mfa (requires auth)">{`Authorization: Bearer <accessToken>

{ "code": "123456" }  // 6-digit code from authenticator app

// Response:
{ "message": "TOTP factor verified and enrolled.", "verified": true }`}</Code>
        <H3>MFA Challenge (Step-up Auth)</H3>
        <Code title="POST /mfa/challenge (requires auth)">{`Authorization: Bearer <accessToken>

{ "code": "654321" }

// Response: New session with aal2 (authenticator assurance level 2)
{ "accessToken": "...", "refreshToken": "...", "aal": "aal2", "user": {...} }`}</Code>
        <H3>Remove TOTP Factor</H3>
        <Code title="DELETE /mfa (requires auth)">{`Authorization: Bearer <accessToken>

// Response:
{ "message": "TOTP factor removed." }`}</Code>
      </S>

      <S title="JWT Structure">
        <p className="text-sm text-zinc-400 mb-3">Access tokens are HS256-signed JWTs with these claims:</p>
        <Code title="Decoded JWT payload">{`{
  "sub": "dyhSQ0svAns1s-37akpJuA",  // user ID
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated",
  "iss": "filybase:test-project",    // issuer = project
  "session_id": "abc123",
  "iat": 1778659496,                 // issued at
  "exp": 1778663096                  // expires (iat + 3600)
}`}</Code>
      </S>

      <S title="Admin API">
        <p className="text-sm text-zinc-400 mb-3">Server-side endpoints for managing users, sessions, and configuration. Require the service role key.</p>
        <Code>{`Authorization: Bearer <serviceRoleKey>`}</Code>
        <Table headers={['Method', 'Path', 'Description']} rows={[
          ['GET', '/admin/users?limit=50&offset=0&q=search', 'List users with pagination and search'],
          ['POST', '/admin/users', 'Create user {email, password, name, status}'],
          ['GET', '/admin/users/:id', 'Get single user by ID'],
          ['PATCH', '/admin/users/:id', 'Update user fields (email, name, status, password, metadata)'],
          ['DELETE', '/admin/users/:id', 'Permanently delete user and revoke all sessions'],
          ['GET', '/admin/config', 'Get full project auth configuration'],
          ['PATCH', '/admin/config', 'Update configuration (providers, policies, etc.)'],
          ['GET', '/admin/stats', 'Get {totalUsers, newThisWeek, activeSessions}'],
          ['GET', '/admin/sessions?userId=...', 'List active sessions'],
          ['DELETE', '/admin/sessions?sessionId=...', 'Revoke specific session'],
          ['DELETE', '/admin/sessions?userId=...', 'Revoke all sessions for a user'],
          ['GET', '/admin/audit?limit=50&action=...', 'Query audit log'],
          ['GET', '/admin/hooks', 'List auth hooks'],
          ['POST', '/admin/hooks', 'Create hook {name, event, uri, enabled}'],
          ['DELETE', '/admin/hooks?id=...', 'Delete hook'],
        ]} />
      </S>

      <S title="Rate Limits">
        <Table headers={['Endpoint', 'Limit', 'Window']} rows={[
          ['POST /signup', '10 requests', 'Per IP per hour'],
          ['POST /signin', '30 requests', 'Per IP per 15 minutes'],
          ['POST /recover', '5 requests', 'Per IP per hour'],
          ['POST /magiclink', '10 requests', 'Per IP per hour'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Rate limit responses return HTTP 429 with a Retry-After header.</p>
      </S>

      <S title="Audit Events">
        <p className="text-sm text-zinc-400 mb-3">All auth actions are logged to the audit trail:</p>
        <Table headers={['Event', 'Trigger']} rows={[
          ['user.signup', 'New user registered'],
          ['user.signin', 'Successful login'],
          ['user.signin_failed', 'Failed login attempt'],
          ['user.password_changed', 'Password updated'],
          ['user.password_reset', 'Password reset via recovery token'],
          ['user.email_verified', 'Email verification confirmed'],
          ['user.mfa_enrolled', 'TOTP factor enrolled'],
          ['user.recovery_requested', 'Password recovery requested'],
        ]} />
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
