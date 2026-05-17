'use client';
import React from 'react';

export default function FunctionsDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Edge Functions</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">Serverless JavaScript functions that execute on demand. Write code in the dashboard, deploy instantly, invoke via HTTP from anywhere. No build step, no deployment pipeline.</p>
      </div>

      <S title="How It Works">
        <p className="text-sm text-zinc-400">1. Create a function in the dashboard (or via API)<br/>2. Write your handler code<br/>3. Save — it&apos;s live immediately<br/>4. Invoke via HTTP at the function&apos;s URL</p>
      </S>

      <S title="Writing a Function">
        <p className="text-sm text-zinc-400 mb-3">Export a default async function that receives a request object and returns a Response:</p>
        <Code title="Basic function">{`export default async function handler(req) {
  return Response.json({
    message: "Hello from FilyBase!",
    method: req.method,
    timestamp: new Date().toISOString()
  })
}`}</Code>
        <Code title="Processing request body">{`export default async function handler(req) {
  const body = await req.json()
  
  if (!body.email) {
    return Response.json({ error: "email required" }, { status: 400 })
  }
  
  // Do something with the data...
  return Response.json({ received: body, processed: true })
}`}</Code>
        <Code title="Using query parameters">{`export default async function handler(req) {
  const { name, age } = req.query
  
  return Response.json({
    greeting: \`Hello \${name || 'world'}, you are \${age || 'unknown'} years old\`
  })
}`}</Code>
        <Code title="Calling external APIs">{`export default async function handler(req) {
  const res = await fetch('https://api.github.com/users/octocat')
  const user = await res.json()
  
  return Response.json({
    name: user.name,
    repos: user.public_repos
  })
}`}</Code>
      </S>

      <S title="Request Object">
        <Table headers={['Property', 'Type', 'Description']} rows={[
          ['req.method', 'string', 'HTTP method (GET, POST, PUT, DELETE, PATCH)'],
          ['req.url', 'string', 'Full request URL'],
          ['req.headers', 'object', 'Frozen object of request headers'],
          ['req.query', 'object', 'Frozen object of URL query parameters'],
          ['req.body', 'any', 'Pre-parsed JSON body (or null)'],
          ['req.json()', 'async () => any', 'Get body as parsed JSON'],
          ['req.text()', 'async () => string', 'Get body as raw text'],
        ]} />
      </S>

      <S title="Response">
        <p className="text-sm text-zinc-400 mb-3">Return a standard Web API Response object:</p>
        <Code>{`// JSON response
return Response.json({ key: "value" })

// JSON with status code
return Response.json({ error: "not found" }, { status: 404 })

// Plain text
return new Response("Hello world", {
  status: 200,
  headers: { "Content-Type": "text/plain" }
})

// HTML
return new Response("<h1>Hello</h1>", {
  headers: { "Content-Type": "text/html" }
})

// Redirect
return Response.redirect("https://example.com", 302)

// No content
return new Response(null, { status: 204 })`}</Code>
      </S>

      <S title="Invoking Functions">
        <Code title="URL format">{`ANY https://your-domain.com/api/functions/<projectId>/invoke/<slug>`}</Code>
        <Code title="curl examples">{`# GET request
curl https://your-domain.com/api/functions/myproject/invoke/hello

# POST with JSON body
curl -X POST https://your-domain.com/api/functions/myproject/invoke/process-order \\
  -H "Content-Type: application/json" \\
  -d '{"orderId": "123", "amount": 49.99}'

# With custom headers
curl https://your-domain.com/api/functions/myproject/invoke/protected \\
  -H "Authorization: Bearer user-token-here"`}</Code>
        <p className="text-xs text-zinc-500 mt-2">All HTTP methods are supported (GET, POST, PUT, PATCH, DELETE). CORS headers are included automatically.</p>
      </S>

      <S title="Management API">
        <Table headers={['Method', 'Path', 'Description']} rows={[
          ['GET', '/api/functions/<projectId>', 'List all functions (id, name, slug, status, invoke_count)'],
          ['POST', '/api/functions/<projectId>', 'Create function {name, code?}'],
          ['GET', '/api/functions/<projectId>/<id>', 'Get function with full code'],
          ['PATCH', '/api/functions/<projectId>/<id>', 'Update {code?, name?, status?}'],
          ['DELETE', '/api/functions/<projectId>?id=<id>', 'Delete function'],
          ['ANY', '/api/functions/<projectId>/invoke/<slug>', 'Execute function'],
        ]} />
      </S>

      <S title="Limits & Security">
        <Table headers={['Limit', 'Value']} rows={[
          ['Execution timeout', '10 seconds'],
          ['Response headers', 'x-function-duration added automatically'],
          ['CORS', 'All origins allowed (Access-Control-Allow-Origin: *)'],
          ['Blocked globals', 'process, require, eval, Function, globalThis, __dirname, __filename'],
          ['Console', 'console.log/warn/error are silenced (no-op)'],
          ['Network', 'fetch() is available for external API calls'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Functions run in a restricted context. They cannot access the filesystem, spawn processes, or import Node.js modules. They can use fetch() to call external APIs and Response to build responses.</p>
      </S>

      <S title="Status">
        <p className="text-sm text-zinc-400">Functions have a status field:</p>
        <Table headers={['Status', 'Behavior']} rows={[
          ['active', 'Function can be invoked'],
          ['inactive', 'Function exists but returns 404 on invoke'],
        ]} />
        <Code title="Disable a function">{`PATCH /api/functions/myproject/<id>
{ "status": "inactive" }`}</Code>
      </S>

      <S title="Use Cases">
        <p className="text-sm text-zinc-400">Common patterns:</p>
        <Code title="Webhook handler">{`export default async function handler(req) {
  const event = await req.json()
  
  if (event.type === 'payment.completed') {
    // Process payment...
    await fetch('https://your-api.com/fulfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: event.orderId })
    })
  }
  
  return Response.json({ received: true })
}`}</Code>
        <Code title="Scheduled task (call via cron)">{`export default async function handler(req) {
  // Clean up expired data, send reminders, etc.
  const result = await fetch('https://your-domain.com/api/db/myproject/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: 'fb_srv_...' },
    body: JSON.stringify({ sql: "DELETE FROM sessions WHERE expires_at < NOW()" })
  })
  
  return Response.json({ cleaned: true })
}`}</Code>
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
