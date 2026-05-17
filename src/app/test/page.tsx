'use client';

import React, { useState, useRef } from 'react';

const PROJECT_ID = 'test-project';

export default function AuthTestPage() {
  const [base, setBase] = useState('');
  const [projectId, setProjectId] = useState(PROJECT_ID);
  const [log, setLog] = useState<string[]>([]);
  const [session, setSession] = useState<any>(null);
  const [oauthClient, setOauthClient] = useState<any>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const apiBase = () => `${base || (typeof window !== 'undefined' ? window.location.origin : '')}/api/auth/${projectId}`;

  const append = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const call = async (method: string, path: string, body?: any, headers?: Record<string, string>) => {
    const url = `${apiBase()}${path}`;
    append(`→ ${method} ${path}`);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json();
      append(`← ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      append(`✗ Error: ${err.message}`);
      return { ok: false, status: 0, data: null };
    }
  };

  // ─── Auth Tests ────────────────────────────────────────────────────────────

  const testSignup = async () => {
    const email = `test${Date.now()}@example.com`;
    const r = await call('POST', '/signup', { email, password: 'testpass123', name: 'Test User' });
    if (r.ok) { setSession(r.data); append('✓ Signup success. Session stored.'); }
  };

  const testSignin = async () => {
    const email = prompt('Email:');
    const password = prompt('Password:');
    if (!email || !password) return;
    const r = await call('POST', '/signin', { email, password });
    if (r.ok) { setSession(r.data); append('✓ Signin success.'); }
  };

  const testGetUser = async () => {
    if (!session) { append('✗ No session. Sign up or sign in first.'); return; }
    await call('GET', '/user', undefined, { Authorization: `Bearer ${session.accessToken}` });
  };

  const testRefresh = async () => {
    if (!session) { append('✗ No session.'); return; }
    const r = await call('POST', '/refresh', { refresh_token: session.refreshToken });
    if (r.ok) { setSession(r.data); append('✓ Token refreshed.'); }
  };

  const testSignout = async () => {
    if (!session) { append('✗ No session.'); return; }
    await call('POST', '/signout', { refresh_token: session.refreshToken });
    setSession(null);
    append('✓ Signed out.');
  };

  const testPasswordChange = async () => {
    if (!session) { append('✗ No session.'); return; }
    const cur = prompt('Current password:');
    const next = prompt('New password (min 8):');
    if (!cur || !next) return;
    await call('PUT', '/password', { currentPassword: cur, newPassword: next }, { Authorization: `Bearer ${session.accessToken}` });
  };

  const testRecover = async () => {
    const email = prompt('Email for recovery:');
    if (!email) return;
    const r = await call('POST', '/recover', { email });
    if (r.ok && r.data?.recovery_token) {
      append(`Recovery token: ${r.data.recovery_token.slice(0, 40)}...`);
      const newPass = prompt('New password:');
      if (newPass) await call('PUT', '/recover', { token: r.data.recovery_token, password: newPass });
    }
  };

  const testMagicLink = async () => {
    const email = prompt('Email:');
    if (!email) return;
    const r = await call('POST', '/magiclink', { email });
    if (r.ok && r.data?.magic_token) {
      append(`Magic token received. Exchanging...`);
      const r2 = await call('PUT', '/magiclink', { token: r.data.magic_token });
      if (r2.ok) { setSession(r2.data); append('✓ Magic link login success.'); }
    }
  };

  const testVerifyEmail = async () => {
    if (!session) { append('✗ No session.'); return; }
    const r = await call('POST', '/verify', undefined, { Authorization: `Bearer ${session.accessToken}` });
    if (r.ok && r.data?.verify_token) {
      append('Verifying...');
      await call('PUT', '/verify', { token: r.data.verify_token });
    }
  };

  const testMfa = async () => {
    if (!session) { append('✗ No session.'); return; }
    const h = { Authorization: `Bearer ${session.accessToken}` };
    const r = await call('POST', '/mfa', undefined, h);
    if (r.ok) {
      append(`TOTP Secret: ${r.data.secret}`);
      append(`OTPAuth URI: ${r.data.otpauth_uri}`);
      const code = prompt('Enter 6-digit TOTP code from your authenticator app:');
      if (code) await call('PUT', '/mfa', { code }, h);
    }
  };

  // ─── OAuth Server Tests ────────────────────────────────────────────────────

  const testCreateOAuthClient = async () => {
    const r = await call('GET', '/admin/config', undefined, { Authorization: 'Bearer __dashboard__' });
    if (!r.ok) { append('✗ Could not get config.'); return; }
    const key = r.data.serviceRoleKey;
    const cr = await call('POST', '/oauth/clients', {
      name: 'Test OAuth App',
      redirectUris: [`${window.location.origin}/test/callback`],
      scopes: ['openid', 'profile', 'email'],
    }, { Authorization: `Bearer ${key}` });
    if (cr.ok) { setOauthClient(cr.data); append(`✓ OAuth client created. ID: ${cr.data.clientId}`); }
  };

  const testOAuthFlow = async () => {
    if (!session) { append('✗ Sign in first (the resource owner).'); return; }
    if (!oauthClient) { append('✗ Create an OAuth client first.'); return; }

    // Step 1: Get authorization code
    append('─── OAuth Authorization Code Flow ───');
    const authR = await call('POST', '/oauth/authorize', {
      client_id: oauthClient.clientId,
      redirect_uri: `${window.location.origin}/test/callback`,
      response_type: 'code',
      scope: 'openid profile email',
      state: 'test-state-123',
    }, { Authorization: `Bearer ${session.accessToken}` });

    if (!authR.ok) return;
    const redirectUrl = new URL(authR.data.redirectTo);
    const code = redirectUrl.searchParams.get('code');
    const state = redirectUrl.searchParams.get('state');
    append(`✓ Auth code: ${code?.slice(0, 20)}... | state: ${state}`);

    // Step 2: Exchange code for tokens
    append('Exchanging code for tokens...');
    const tokenR = await call('POST', '/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${window.location.origin}/test/callback`,
      client_id: oauthClient.clientId,
      client_secret: oauthClient.clientSecret,
    });
    if (tokenR.ok) {
      append(`✓ Access token: ${tokenR.data.access_token?.slice(0, 30)}...`);
      append(`✓ Refresh token: ${tokenR.data.refresh_token?.slice(0, 20)}...`);
      if (tokenR.data.id_token) append(`✓ ID token present (OpenID Connect)`);

      // Step 3: Call userinfo
      append('Fetching userinfo...');
      await call('GET', '/oauth/userinfo', undefined, { Authorization: `Bearer ${tokenR.data.access_token}` });
    }
  };

  const testOAuthPKCE = async () => {
    if (!session) { append('✗ Sign in first.'); return; }
    if (!oauthClient) { append('✗ Create an OAuth client first.'); return; }

    append('─── OAuth PKCE Flow (Public Client) ───');

    // Generate code_verifier and code_challenge
    const verifier = generateRandomString(64);
    const challenge = await sha256Base64Url(verifier);
    append(`Code verifier: ${verifier.slice(0, 20)}...`);
    append(`Code challenge (S256): ${challenge.slice(0, 20)}...`);

    // Step 1: Authorize with PKCE
    const authR = await call('POST', '/oauth/authorize', {
      client_id: oauthClient.clientId,
      redirect_uri: `${window.location.origin}/test/callback`,
      response_type: 'code',
      scope: 'openid email',
      state: 'pkce-test',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }, { Authorization: `Bearer ${session.accessToken}` });

    if (!authR.ok) return;
    const redirectUrl = new URL(authR.data.redirectTo);
    const code = redirectUrl.searchParams.get('code');
    append(`✓ Auth code: ${code?.slice(0, 20)}...`);

    // Step 2: Exchange with code_verifier (no client_secret needed)
    const tokenR = await call('POST', '/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${window.location.origin}/test/callback`,
      client_id: oauthClient.clientId,
      code_verifier: verifier,
    });
    if (tokenR.ok) append('✓ PKCE flow complete. Tokens received.');
  };

  const testOAuthRefresh = async () => {
    if (!session) { append('✗ No session.'); return; }
    const refreshToken = prompt('Paste a refresh_token from a previous OAuth flow:');
    if (!refreshToken) return;
    await call('POST', '/oauth/token', { grant_type: 'refresh_token', refresh_token: refreshToken });
  };

  const testDiscovery = async () => {
    await call('GET', '/.well-known/openid-configuration');
  };

  const testHealth = async () => {
    await call('GET', '/health');
  };

  // ─── Admin Tests ───────────────────────────────────────────────────────────

  const testAdminListUsers = async () => {
    const r = await call('GET', '/admin/config', undefined, { Authorization: 'Bearer __dashboard__' });
    if (!r.ok) return;
    await call('GET', '/admin/users?limit=10', undefined, { Authorization: `Bearer ${r.data.serviceRoleKey}` });
  };

  const testAdminStats = async () => {
    const r = await call('GET', '/admin/config', undefined, { Authorization: 'Bearer __dashboard__' });
    if (!r.ok) return;
    await call('GET', '/admin/stats', undefined, { Authorization: `Bearer ${r.data.serviceRoleKey}` });
  };

  const testAuditLog = async () => {
    const r = await call('GET', '/admin/config', undefined, { Authorization: 'Bearer __dashboard__' });
    if (!r.ok) return;
    await call('GET', '/admin/audit?limit=10', undefined, { Authorization: `Bearer ${r.data.serviceRoleKey}` });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6 font-mono text-sm">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-medium mb-1">FilyBase Auth Test Console</h1>
        <div className="flex items-center gap-3 mb-6">
          <p className="text-xs text-zinc-500">Project:</p>
          <input value={projectId} onChange={e => setProjectId(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-emerald-400 w-56 outline-none focus:border-emerald-600" />
          <p className="text-xs text-zinc-600">Base: {apiBase()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <Section title="Authentication">
              <Btn onClick={testSignup}>Sign Up (random email)</Btn>
              <Btn onClick={testSignin}>Sign In (prompt)</Btn>
              <Btn onClick={testGetUser}>Get User</Btn>
              <Btn onClick={testRefresh}>Refresh Token</Btn>
              <Btn onClick={testSignout}>Sign Out</Btn>
              <Btn onClick={testPasswordChange}>Change Password</Btn>
              <Btn onClick={testRecover}>Password Recovery</Btn>
              <Btn onClick={testMagicLink}>Magic Link</Btn>
              <Btn onClick={testVerifyEmail}>Verify Email</Btn>
              <Btn onClick={testMfa}>Enroll MFA (TOTP)</Btn>
            </Section>

            <Section title="OAuth 2.1 Server">
              <Btn onClick={testCreateOAuthClient}>Create OAuth Client</Btn>
              <Btn onClick={testOAuthFlow}>Full OAuth Flow</Btn>
              <Btn onClick={testOAuthPKCE}>PKCE Flow (Public)</Btn>
              <Btn onClick={testOAuthRefresh}>Refresh (OAuth)</Btn>
              <Btn onClick={testDiscovery}>OIDC Discovery</Btn>
            </Section>

            <Section title="Admin">
              <Btn onClick={testAdminListUsers}>List Users</Btn>
              <Btn onClick={testAdminStats}>Stats</Btn>
              <Btn onClick={testAuditLog}>Audit Log</Btn>
              <Btn onClick={testHealth}>Health Check</Btn>
            </Section>

            {session && (
              <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg p-3">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Active Session</p>
                <p className="text-[10px] text-zinc-400 break-all">User: {session.user?.email}</p>
                <p className="text-[10px] text-zinc-500 break-all mt-1">AT: {session.accessToken?.slice(0, 25)}...</p>
              </div>
            )}

            {oauthClient && (
              <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg p-3">
                <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">OAuth Client</p>
                <p className="text-[10px] text-zinc-400">ID: {oauthClient.clientId}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Secret: {oauthClient.clientSecret?.slice(0, 15)}...</p>
              </div>
            )}
          </div>

          {/* Log */}
          <div className="bg-[#111113] border border-zinc-800 rounded-lg flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Console Output</span>
              <button onClick={() => setLog([])} className="text-[10px] text-zinc-600 hover:text-zinc-400">Clear</button>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-1">
              {log.length === 0 && <p className="text-zinc-600">Click a button to start testing...</p>}
              {log.map((l, i) => (
                <p key={i} className={`text-[11px] leading-relaxed break-all ${l.includes('✓') ? 'text-emerald-400' : l.includes('✗') ? 'text-red-400' : l.startsWith('[') && l.includes('→') ? 'text-blue-400' : l.includes('───') ? 'text-yellow-400 font-medium' : 'text-zinc-400'}`}>{l}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111113] border border-zinc-800 rounded-lg p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left truncate">
      {children}
    </button>
  );
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) result += chars[arr[i] % chars.length];
  return result;
}

async function sha256Base64Url(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
