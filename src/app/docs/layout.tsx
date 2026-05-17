'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, Database, Users, Lightning, Key, Globe, Code, Shield, Gear, ArrowLeft, Copy, Check } from '@phosphor-icons/react';

const NAV = [
  { href: '/docs', label: 'Getting Started', icon: Book },
  { href: '/docs/auth', label: 'Authentication', icon: Users },
  { href: '/docs/database', label: 'Database', icon: Database },
  { href: '/docs/functions', label: 'Edge Functions', icon: Lightning },
  { href: '/docs/oauth', label: 'OAuth 2.1 Server', icon: Globe },
  { href: '/docs/api-keys', label: 'API Keys & OSINT', icon: Key },
  { href: '/docs/sdk', label: 'Client SDK', icon: Code },
  { href: '/docs/security', label: 'Security', icon: Shield },
  { href: '/docs/self-hosting', label: 'Self-Hosting', icon: Gear },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex">
      <aside className="w-60 border-r border-zinc-800 p-5 sticky top-0 h-screen overflow-y-auto shrink-0">
        <Link href="/" className="flex items-center gap-2 mb-6 text-zinc-400 hover:text-white text-xs transition-colors">
          <ArrowLeft size={12} />Back to app
        </Link>
        <Link href="/docs" className="flex items-center gap-2 mb-6">
          <span className="text-base font-medium tracking-tight">FilyBase</span>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-medium">DOCS</span>
        </Link>
        <nav className="space-y-0.5">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${pathname === n.href ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
              <n.icon size={14} />{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 pt-4 border-t border-zinc-800">
          <ClaudePromptButton />
          <p className="text-[10px] text-zinc-600 px-3 mt-3">v1.0.0</p>
        </div>
      </aside>
      <main className="flex-1 p-8 md:p-12 max-w-4xl overflow-y-auto">
        {children}
      </main>
    </div>
  );
}


const CLAUDE_PROMPT = `You are integrating with FilyBase, a self-hosted backend-as-a-service platform. Here's everything you need to know:

## Authentication
Base URL: /api/auth/<projectId>

Sign up: POST /signup { email, password, name }
Sign in: POST /signin { email, password }
Refresh: POST /refresh { refresh_token }
Sign out: POST /signout { refresh_token }
Get user: GET /user (Bearer <accessToken>)
Update user: PATCH /user (Bearer <accessToken>) { name, metadata }
Change password: PUT /password (Bearer <accessToken>) { currentPassword, newPassword }
Magic link: POST /magiclink { email } → PUT /magiclink { token }
Recovery: POST /recover { email } → PUT /recover { token, password }
MFA enroll: POST /mfa (Bearer) → PUT /mfa { code }
MFA challenge: POST /mfa/challenge (Bearer) { code }

All auth responses return: { accessToken, tokenType, expiresIn, expiresAt, refreshToken, user }
Errors return: { error: "code", error_description: "message" }

## Database REST API
Base URL: /api/db/<projectId>/<table>

Headers: apikey: <anonKey> (read-only) or apikey: <serviceRoleKey> (full CRUD)

GET /<table>?column=eq.value&order=col.desc&limit=50&offset=0 → { data: [...], count: N }
POST /<table> { ...row } → { data: [inserted], count: 1 }
PATCH /<table>?id=eq.5 { ...updates } → { data: [updated], count: 1 }
DELETE /<table>?id=eq.5 → { data: [deleted], count: 1 }

Filter operators: eq, neq, gt, gte, lt, lte, like, ilike
Example: ?status=eq.active&age=gte.18&order=created_at.desc

Raw SQL: POST /api/db/<projectId>/query { sql: "SELECT...", params: [$1, $2] }

## Edge Functions
Invoke: ANY /api/functions/<projectId>/invoke/<slug>
Functions receive: { method, url, headers, query, body, json(), text() }
Functions return: Response.json({...}) or new Response(body, { status, headers })

## OAuth 2.1 Server
Authorization: GET /api/auth/<projectId>/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=openid+profile+email&code_challenge=...&code_challenge_method=S256
Token: POST /api/auth/<projectId>/oauth/token { grant_type: "authorization_code", code, redirect_uri, client_id, code_verifier }
UserInfo: GET /api/auth/<projectId>/oauth/userinfo (Bearer <access_token>)
Discovery: GET /api/auth/<projectId>/.well-known/openid-configuration

## Client SDK
import { createFilyAuth } from '@filybase/auth/client'
const auth = createFilyAuth({ baseUrl: '/api/auth/<projectId>', anonKey: '...' })
auth.signUp({ email, password, name }) → { data, error }
auth.signIn({ email, password }) → { data, error }
auth.getUser() → { data, error }
auth.signOut()
auth.getAccessToken() → string | null
auth.refreshSession() → { data, error }

## Key Rules
- Anon key = read-only database access (safe for client-side)
- Service role key = full access (server-side only, never expose to browser)
- Access tokens expire in 1 hour, refresh tokens last 30 days
- All internal tables (auth_*, edge_functions, osint_*) are blocked from the REST API
- 2 GB storage quota per project
- Rate limits: 10 signups/hr, 30 signins/15min per IP

When writing code that integrates with FilyBase:
1. Use the Client SDK for auth in browser apps
2. Use the REST API for database operations
3. Always use parameterized queries ($1, $2) for raw SQL
4. Store service role key in environment variables only
5. Handle { data, error } return pattern from SDK methods
6. Refresh tokens rotate on each use — store the new one`;

function ClaudePromptButton() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(CLAUDE_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Claude Prompt'}
    </button>
  );
}
