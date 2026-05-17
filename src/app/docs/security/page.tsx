'use client';
import React from 'react';

export default function SecurityDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Security</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Security architecture, best practices, and hardening measures built into FilyBase.</p>
      </div>

      <S title="Password Security">
        <p className="text-sm text-zinc-400 mb-3">Passwords are hashed using scrypt with these parameters:</p>
        <Table headers={['Parameter', 'Value']} rows={[
          ['Algorithm', 'scrypt'],
          ['N (CPU/memory cost)', '16384'],
          ['r (block size)', '8'],
          ['p (parallelization)', '1'],
          ['Key length', '64 bytes'],
          ['Salt', '16 random bytes per password'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Passwords are normalized (NFKC) before hashing. Comparison uses timing-safe equality to prevent timing attacks.</p>
      </S>

      <S title="JWT Security">
        <Table headers={['Property', 'Value']} rows={[
          ['Algorithm', 'HS256 (HMAC-SHA256)'],
          ['Secret', 'Auto-generated 48-byte random per project'],
          ['Access token TTL', '1 hour (configurable)'],
          ['Refresh token TTL', '30 days (configurable)'],
          ['Refresh rotation', 'Enabled (each token used once)'],
          ['Signature verification', 'Timing-safe comparison'],
        ]} />
      </S>

      <S title="Rate Limiting">
        <p className="text-sm text-zinc-400 mb-3">In-memory sliding window rate limiter protects against brute force:</p>
        <Table headers={['Endpoint', 'Limit', 'Window']} rows={[
          ['Signup', '10 per IP', '1 hour'],
          ['Signin', '30 per IP', '15 minutes'],
          ['Password recovery', '5 per IP', '1 hour'],
          ['Magic link', '10 per IP', '1 hour'],
          ['OSINT lookup', 'Tier-based', '1 minute'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Rate limit state is stored in-memory. For multi-instance deployments, swap with Redis.</p>
      </S>

      <S title="Middleware Security Headers">
        <p className="text-sm text-zinc-400 mb-3">All responses include these security headers:</p>
        <Table headers={['Header', 'Value']} rows={[
          ['X-Content-Type-Options', 'nosniff'],
          ['X-Frame-Options', 'DENY'],
          ['X-XSS-Protection', '1; mode=block'],
          ['Referrer-Policy', 'strict-origin-when-cross-origin'],
          ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
          ['Strict-Transport-Security', 'max-age=63072000 (production only)'],
          ['Cache-Control', 'no-store (API routes)'],
          ['X-Powered-By', 'Removed'],
        ]} />
      </S>

      <S title="Database Security">
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-2">
          <li><strong>Internal tables blocked:</strong> Users cannot access auth_*, edge_functions, osint_* tables via the REST API</li>
          <li><strong>Anon key = read-only:</strong> Cannot perform writes with the public key</li>
          <li><strong>Query timeout:</strong> 10 second max execution prevents runaway queries</li>
          <li><strong>Result cap:</strong> Max 1000 rows per response prevents memory exhaustion</li>
          <li><strong>DDL protection:</strong> Cannot DROP/ALTER/TRUNCATE internal tables from SQL editor</li>
          <li><strong>Parameterized queries:</strong> All internal queries use $1, $2 parameters (no string interpolation)</li>
          <li><strong>Connection pooling:</strong> Max 20 connections, 5s connect timeout, idle cleanup</li>
        </ul>
      </S>

      <S title="Edge Function Sandboxing">
        <p className="text-sm text-zinc-400 mb-3">User code runs in a restricted context:</p>
        <Table headers={['Blocked', 'Reason']} rows={[
          ['process', 'No access to environment variables or system info'],
          ['require', 'No Node.js module imports'],
          ['eval / Function', 'No dynamic code generation'],
          ['globalThis', 'No access to global scope'],
          ['__dirname / __filename', 'No filesystem path info'],
          ['console.*', 'Silenced (no-op) to prevent log injection'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Functions can use fetch() for network requests and Response for building responses. 10-second execution timeout enforced.</p>
      </S>

      <S title="OAuth Security">
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-2">
          <li><strong>PKCE required for public clients:</strong> Prevents authorization code interception</li>
          <li><strong>Code expiry:</strong> Authorization codes expire after 10 minutes</li>
          <li><strong>Single-use codes:</strong> Each code can only be exchanged once</li>
          <li><strong>Exact redirect URI matching:</strong> No wildcards or partial matches</li>
          <li><strong>Client secrets hashed:</strong> Stored using scrypt, never in plaintext</li>
          <li><strong>State parameter:</strong> Recommended for CSRF protection</li>
        </ul>
      </S>

      <S title="Production Hardening">
        <p className="text-sm text-zinc-400 mb-3">When NODE_ENV=production:</p>
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-2">
          <li>/test page returns 404</li>
          <li>/api/db/* requires ADMIN_SECRET header</li>
          <li>HSTS header enabled (63072000 seconds)</li>
          <li>Error responses hide stack traces and internal details</li>
          <li>SSL required for database connections (rejectUnauthorized: true)</li>
          <li>No hardcoded credentials in source code</li>
        </ul>
      </S>

      <S title="Best Practices">
        <ul className="text-sm text-zinc-400 list-disc list-inside space-y-2">
          <li>Never expose the service role key in client-side code</li>
          <li>Use the anon key for browser/mobile apps (read-only access)</li>
          <li>Set a strong ADMIN_SECRET (32+ random bytes)</li>
          <li>Rotate the ADMIN_SECRET periodically</li>
          <li>Monitor the audit log for suspicious activity</li>
          <li>Enable MFA for admin accounts</li>
          <li>Use HTTPS in production (enforce via HSTS)</li>
          <li>Keep DATABASE_URL in environment variables only (never in code)</li>
        </ul>
      </S>
    </div>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h2 className="text-base font-medium text-white border-b border-zinc-800 pb-2">{title}</h2>{children}</section>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto border border-zinc-800 rounded-lg"><table className="w-full text-xs"><thead><tr className="bg-zinc-900 border-b border-zinc-800">{headers.map(h => <th key={h} className="px-3 py-2 text-left text-zinc-500 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800/50">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 text-zinc-300">{c}</td>)}</tr>)}</tbody></table></div>;
}
