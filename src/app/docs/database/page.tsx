'use client';

import React from 'react';

export default function DatabaseDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Database</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">PostgreSQL database with a PostgREST-style REST API and raw SQL access. Each project gets isolated storage with a 2 GB quota. Connect from any language using HTTP.</p>
      </div>

      <S title="Connecting to Your Database">
        <p className="text-sm text-zinc-400 mb-3">Your app connects via HTTP using your project keys. No direct PostgreSQL connection needed.</p>
        <Code title="Two ways to authenticate">{`# Option 1: apikey header
apikey: fb_anon_...

# Option 2: Bearer token
Authorization: Bearer fb_anon_...`}</Code>
        <Table headers={['Key Type', 'Permissions', 'Use Case']} rows={[
          ['Anon Key (fb_anon_...)', 'SELECT only', 'Client-side apps, public reads'],
          ['Service Role Key (fb_srv_...)', 'Full CRUD + DDL', 'Server-side, admin operations'],
        ]} />
        <p className="text-xs text-zinc-500 mt-2">Find your keys in Dashboard → Auth → SDK tab, or via GET /api/auth/&lt;projectId&gt;/admin/config.</p>
      </S>

      <S title="REST API">
        <Code title="Base URL">{`https://your-domain.com/api/db/<projectId>/<table>`}</Code>

        <H3>Select Rows (GET)</H3>
        <Code title="Basic select">{`GET /api/db/myproject/todos
apikey: fb_anon_...

// Response:
{ "data": [...], "count": 5 }`}</Code>
        <Code title="With filters, ordering, pagination">{`GET /api/db/myproject/todos?status=eq.active&order=created_at.desc&limit=10&offset=0&select=id,title,done
apikey: fb_anon_...`}</Code>

        <H3>Insert Rows (POST)</H3>
        <Code title="Single row">{`POST /api/db/myproject/todos
apikey: fb_srv_...
Content-Type: application/json

{ "title": "Buy groceries", "done": false, "user_id": "abc" }

// Response 201:
{ "data": [{ "id": 1, "title": "Buy groceries", ... }], "count": 1 }`}</Code>
        <Code title="Multiple rows">{`POST /api/db/myproject/todos
apikey: fb_srv_...

[
  { "title": "Task 1", "done": false },
  { "title": "Task 2", "done": false }
]`}</Code>

        <H3>Update Rows (PATCH)</H3>
        <Code title="Update with filter (required)">{`PATCH /api/db/myproject/todos?id=eq.5
apikey: fb_srv_...

{ "done": true, "completed_at": "2026-05-17T12:00:00Z" }

// Response:
{ "data": [{ "id": 5, "done": true, ... }], "count": 1 }`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Filters are required for PATCH to prevent accidental full-table updates.</p>

        <H3>Delete Rows (DELETE)</H3>
        <Code title="Delete with filter (required)">{`DELETE /api/db/myproject/todos?id=eq.5
apikey: fb_srv_...

// Response:
{ "data": [{ "id": 5, ... }], "count": 1 }`}</Code>
      </S>

      <S title="Filters">
        <p className="text-sm text-zinc-400 mb-3">Add filters as query parameters in the format <code className="text-emerald-400">?column=operator.value</code></p>
        <Table headers={['Operator', 'Meaning', 'Example', 'SQL Equivalent']} rows={[
          ['eq', 'Equals', '?status=eq.active', "status = 'active'"],
          ['neq', 'Not equals', '?status=neq.deleted', "status != 'deleted'"],
          ['gt', 'Greater than', '?age=gt.18', 'age > 18'],
          ['gte', 'Greater or equal', '?age=gte.18', 'age >= 18'],
          ['lt', 'Less than', '?price=lt.100', 'price < 100'],
          ['lte', 'Less or equal', '?price=lte.100', 'price <= 100'],
          ['like', 'Pattern match', '?name=like.john', "name LIKE '%john%'"],
          ['ilike', 'Case-insensitive', '?name=ilike.JOHN', "name ILIKE '%JOHN%'"],
        ]} />
        <Code title="Combining filters (AND)">{`GET /api/db/myproject/todos?status=eq.active&priority=gte.3&order=created_at.desc`}</Code>
      </S>

      <S title="Query Parameters">
        <Table headers={['Param', 'Default', 'Description']} rows={[
          ['limit', '50', 'Max rows to return (max 1000)'],
          ['offset', '0', 'Skip N rows (for pagination)'],
          ['order', '(none)', 'Sort: column.asc or column.desc'],
          ['select', '*', 'Comma-separated column names'],
        ]} />
      </S>

      <S title="Raw SQL">
        <p className="text-sm text-zinc-400 mb-3">For complex queries, use the SQL endpoint directly. Requires service role key.</p>
        <Code title="POST /api/db/<projectId>/query">{`{
  "sql": "SELECT t.*, u.name as user_name FROM todos t JOIN users u ON t.user_id = u.id WHERE t.status = $1 ORDER BY t.created_at DESC LIMIT $2",
  "params": ["active", 20]
}

// Response:
{
  "data": [...],
  "count": 15,
  "fields": ["id", "title", "done", "user_name"],
  "duration": 12
}`}</Code>
        <p className="text-xs text-zinc-500 mt-2">Use $1, $2, etc. for parameterized queries. Never concatenate user input into SQL strings.</p>
      </S>

      <S title="Creating Tables">
        <p className="text-sm text-zinc-400 mb-3">Use the SQL editor in the dashboard or the raw SQL endpoint:</p>
        <Code>{`POST /api/db/myproject/query
apikey: fb_srv_...

{
  "sql": "CREATE TABLE todos (id SERIAL PRIMARY KEY, title TEXT NOT NULL, done BOOLEAN DEFAULT FALSE, user_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW())"
}`}</Code>
      </S>

      <S title="Storage Quota">
        <p className="text-sm text-zinc-400 mb-3">Each project has a 2 GB storage limit enforced at the application level.</p>
        <Code title="Check usage: GET /api/db/quota?projectId=myproject">{`{
  "quota": {
    "maxBytes": 2147483648,
    "maxFormatted": "2 GB",
    "usedBytes": 52428800,
    "usedFormatted": "50.0 MB",
    "percentUsed": 2,
    "remaining": 2095054848,
    "remainingFormatted": "1.9 GB",
    "exceeded": false
  },
  "tables": [
    { "name": "todos", "size": 8192, "sizeFormatted": "8.0 KB", "columns": 5 }
  ]
}`}</Code>
        <p className="text-xs text-zinc-500 mt-2">When quota is exceeded, INSERT/UPDATE/CREATE operations return HTTP 507. SELECT and DELETE always work.</p>
      </S>

      <S title="Security">
        <Table headers={['Rule', 'Details']} rows={[
          ['Internal tables hidden', 'auth_*, edge_functions, osint_* tables are blocked from REST API'],
          ['Anon key = read-only', 'Cannot INSERT, UPDATE, DELETE, or CREATE with anon key'],
          ['Query timeout', '10 second max execution time per query'],
          ['Result cap', 'Max 1000 rows per response'],
          ['Parameterized queries', 'Always use $1, $2 params — never string concatenation'],
          ['DDL protection', 'Cannot DROP/ALTER internal tables from SQL editor'],
        ]} />
      </S>

      <S title="JavaScript Example">
        <Code title="Full CRUD from a frontend app">{`const API = 'https://your-domain.com/api/db/myproject'
const KEY = 'fb_srv_...'  // Use anon key for reads in client-side code

// Create
const { data } = await fetch(API + '/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: KEY },
  body: JSON.stringify({ title: 'New task', done: false })
}).then(r => r.json())

// Read
const { data: todos } = await fetch(
  API + '/todos?done=eq.false&order=created_at.desc&limit=10',
  { headers: { apikey: KEY } }
).then(r => r.json())

// Update
await fetch(API + '/todos?id=eq.' + id, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', apikey: KEY },
  body: JSON.stringify({ done: true })
})

// Delete
await fetch(API + '/todos?id=eq.' + id, {
  method: 'DELETE',
  headers: { apikey: KEY }
})`}</Code>
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
