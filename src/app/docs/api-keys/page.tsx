'use client';
import React from 'react';

export default function ApiKeysDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">API Keys & OSINT</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Manage API keys for the OSINT phone lookup service. Keys are tier-based with automatic rate limiting and usage tracking.</p>
      </div>

      <S title="OSINT Lookup API">
        <Code title="GET /api/osint/lookup">{`# Query parameter authentication
GET /api/osint/lookup?key=fb_abc123...&num=+1234567890

# Header authentication
GET /api/osint/lookup?num=+1234567890
x-api-key: fb_abc123...`}</Code>
        <Code title="Success Response">{`{
  "name": "John Doe",
  "carrier": "Verizon",
  "location": "New York, US",
  "type": "mobile",
  ...
}`}</Code>
        <Code title="Error Responses">{`// 401 - Missing key
{ "error": "Missing API key. Pass ?key= or x-api-key header." }

// 403 - Invalid key
{ "error": "Invalid API Key" }

// 403 - Suspended
{ "error": "Account Restricted", "message": "Your API key is suspended or revoked." }

// 429 - Rate limited
{ "error": "rate_limit_exceeded", "message": "Too many requests.", "retry_after": 45 }

// 507 - Upstream error
{ "error": "Upstream error", "status": 502 }`}</Code>
      </S>

      <S title="Rate Limits by Tier">
        <Table headers={['Tier', 'Requests/Minute', 'Best For']} rows={[
          ['free', '5', 'Testing and development'],
          ['pro', '30', 'Production applications'],
          ['enterprise', 'Unlimited', 'High-volume use cases'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Rate limits reset every 60 seconds. Exceeding the limit returns HTTP 429 with a Retry-After header.</p>
      </S>

      <S title="Key Management API">
        <H3>List All Keys</H3>
        <Code>{`GET /api/osint/keys

// Response:
{ "keys": [{ "id": "...", "key": "fb_...", "tier": "pro", "status": "active", "name": "Production", "created_at": ... }] }`}</Code>

        <H3>Create a Key</H3>
        <Code>{`POST /api/osint/keys
Content-Type: application/json

{
  "name": "My App - Production",
  "tier": "pro",           // "free", "pro", or "enterprise"
  "owner_id": "user-123"  // optional, for tracking
}

// Response 201:
{ "id": "abc...", "key": "fb_7a8b9c...", "tier": "pro", "status": "active", "name": "My App - Production" }`}</Code>

        <H3>Update a Key</H3>
        <Code>{`PATCH /api/osint/keys
Content-Type: application/json

{ "id": "abc...", "tier": "enterprise" }
// or
{ "id": "abc...", "status": "active" }  // reactivate a revoked key`}</Code>

        <H3>Revoke a Key</H3>
        <Code>{`DELETE /api/osint/keys?id=abc...

// Response:
{ "ok": true }`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Revoking sets status to &quot;revoked&quot;. The key still exists in the database for audit purposes but can no longer be used.</p>
      </S>

      <S title="Usage Logs">
        <Code>{`GET /api/osint/usage?limit=50
GET /api/osint/usage?key=fb_abc123...  // Filter by specific key

// Response:
{
  "logs": [
    { "api_key": "fb_abc...", "num": "+1234567890", "tier": "pro", "ip": "1.2.3.4", "timestamp": 1778659496000 }
  ],
  "stats": {
    "total": "1523",
    "unique_nums": "892",
    "unique_keys": "12"
  }
}`}</Code>
      </S>

      <S title="Dashboard">
        <p className="text-sm text-zinc-400">Manage keys visually at <code className="text-emerald-400">/dashboard/project/[id]/api-keys</code>. Features:</p>
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-1 mt-2">
          <li>Create and revoke keys with one click</li>
          <li>Change tiers on the fly</li>
          <li>View/hide key values securely</li>
          <li>Usage stats (total lookups, unique numbers, active keys)</li>
          <li>Request log table with IP, timestamp, and tier info</li>
        </ul>
      </S>

      <S title="JavaScript Example">
        <Code>{`// Simple lookup function
async function lookupPhone(number) {
  const res = await fetch(
    \`https://your-domain.com/api/osint/lookup?num=\${encodeURIComponent(number)}\`,
    { headers: { 'x-api-key': process.env.OSINT_API_KEY } }
  )
  
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Lookup failed')
  }
  
  return res.json()
}

// Usage
const info = await lookupPhone('+14155551234')
console.log(info.name, info.carrier)`}</Code>
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
