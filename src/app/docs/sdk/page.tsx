'use client';
import React from 'react';

export default function SdkDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Client SDK</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Zero-dependency JavaScript/TypeScript client for browser and Node.js apps. Handles authentication, token refresh, and session persistence automatically.</p>
      </div>

      <S title="Installation">
        <p className="text-sm text-zinc-400 mb-3">Copy <code className="text-emerald-400">src/lib/auth/client.ts</code> into your project, or import from the SDK tab in your dashboard.</p>
        <Code>{`import { createFilyAuth } from './filybase-auth-client'
// or
import { createFilyAuth } from '@frenix-labs/filybase/auth'`}</Code>
      </S>

      <S title="Initialize">
        <Code>{`const auth = createFilyAuth({
  baseUrl: 'https://your-domain.com/api/auth/your-project-id',
  anonKey: 'fb_anon_...',        // optional, sent as apikey header
  persistSession: true,           // default: true (localStorage)
  storageKey: 'filybase-auth-session'  // default localStorage key
})`}</Code>
      </S>

      <S title="Sign Up">
        <Code>{`const { data, error } = await auth.signUp({
  email: 'user@example.com',
  password: 'securepass123',
  name: 'Jane Doe',              // optional
  metadata: { plan: 'free' }     // optional
})

if (error) {
  console.error(error.error_description)
} else {
  console.log('Signed up:', data.user.email)
  console.log('Access token:', data.accessToken)
}`}</Code>
      </S>

      <S title="Sign In">
        <Code>{`const { data, error } = await auth.signIn({
  email: 'user@example.com',
  password: 'securepass123'
})

if (data) {
  // Session is automatically stored in localStorage
  // Token refresh is scheduled automatically
}`}</Code>
      </S>

      <S title="Get Current User">
        <Code>{`const { data: user, error } = await auth.getUser()

if (user) {
  console.log(user.email, user.name)
}`}</Code>
      </S>

      <S title="Update User">
        <Code>{`const { data, error } = await auth.updateUser({
  name: 'Jane Smith',
  metadata: { theme: 'dark' }
})`}</Code>
      </S>

      <S title="Sign Out">
        <Code>{`await auth.signOut()
// Session cleared from localStorage
// Refresh token revoked on server`}</Code>
      </S>

      <S title="Get Session & Token">
        <Code>{`// Get the full session object
const session = auth.getSession()
// { accessToken, refreshToken, expiresIn, expiresAt, user }

// Get just the access token (for API calls)
const token = auth.getAccessToken()
// "eyJhbG..." or null if not signed in`}</Code>
      </S>

      <S title="Manual Refresh">
        <Code>{`// Tokens refresh automatically, but you can force it:
const { data, error } = await auth.refreshSession()`}</Code>
      </S>

      <S title="Auto-Refresh Behavior">
        <p className="text-sm text-zinc-400">The SDK automatically refreshes the access token 60 seconds before it expires. This happens in the background — no action needed. If the refresh fails (e.g., token revoked), the session is cleared.</p>
      </S>

      <S title="Using with fetch()">
        <Code title="Authenticated API calls">{`// Use the access token for your own API calls
const token = auth.getAccessToken()

const res = await fetch('https://your-api.com/data', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  }
})

// Or for the FilyBase Database API:
const res = await fetch('/api/db/myproject/todos?done=eq.false', {
  headers: { 'apikey': token }
})`}</Code>
      </S>

      <S title="Server-Side (Node.js)">
        <Code>{`// Works in Node.js too — just disable persistence
const auth = createFilyAuth({
  baseUrl: 'https://your-domain.com/api/auth/your-project-id',
  persistSession: false  // No localStorage in Node
})

// Sign in programmatically
const { data } = await auth.signIn({ email: '...', password: '...' })
// Use data.accessToken for subsequent requests`}</Code>
      </S>

      <S title="React Example">
        <Code title="Auth context provider">{`// auth-context.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { createFilyAuth } from './filybase-auth-client'

const auth = createFilyAuth({
  baseUrl: '/api/auth/my-project',
  anonKey: 'fb_anon_...'
})

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const session = auth.getSession()
    if (session) {
      setUser(session.user)
    }
    setLoading(false)
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await auth.signIn({ email, password })
    if (data) setUser(data.user)
    return { data, error }
  }

  const signOut = async () => {
    await auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, auth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)`}</Code>
      </S>

      <S title="Configuration Reference">
        <Table headers={['Option', 'Type', 'Default', 'Description']} rows={[
          ['baseUrl', 'string', '(required)', 'Full URL to your project auth API'],
          ['anonKey', 'string?', 'undefined', 'Public key sent as apikey header on all requests'],
          ['persistSession', 'boolean', 'true', 'Store session in localStorage (browser only)'],
          ['storageKey', 'string', '"filybase-auth-session"', 'Key name for localStorage'],
        ]} />
      </S>

      <S title="Return Types">
        <Code title="All methods return Result<T>">{`type Result<T> = 
  | { data: T; error: null }      // Success
  | { data: null; error: AuthError }  // Failure

interface AuthError {
  error: string              // e.g. "invalid_credentials"
  error_description: string  // Human-readable message
}

interface AuthSession {
  accessToken: string
  tokenType: string
  expiresIn: number      // seconds until expiry
  expiresAt: number      // unix timestamp
  refreshToken: string
  user: Record<string, unknown>
}`}</Code>
      </S>
    </div>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h2 className="text-base font-medium text-white border-b border-zinc-800 pb-2">{title}</h2>{children}</section>;
}
function Code({ title, children }: { title?: string; children: string }) {
  return <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">{title && <div className="px-4 py-1.5 border-b border-zinc-800 text-[10px] text-zinc-500">{title}</div>}<pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto leading-relaxed whitespace-pre">{children}</pre></div>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto border border-zinc-800 rounded-lg"><table className="w-full text-xs"><thead><tr className="bg-zinc-900 border-b border-zinc-800">{headers.map(h => <th key={h} className="px-3 py-2 text-left text-zinc-500 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800/50">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 text-zinc-300">{c}</td>)}</tr>)}</tbody></table></div>;
}
