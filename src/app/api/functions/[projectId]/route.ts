import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { randomBytes } from "node:crypto";

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

// List all functions for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    await ensureTable();
    const result = await pool.query(
      "SELECT id, project_id, name, slug, status, created_at, updated_at, invoke_count FROM edge_functions WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    return Response.json({ functions: result.rows });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Create a new function
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    await ensureTable();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "name is required" }, { status: 400 });

    const id = randomBytes(12).toString("hex");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const code = body.code ?? defaultCode(name);
    const now = Date.now();

    await pool.query(
      `INSERT INTO edge_functions (id, project_id, name, slug, code, status, created_at, updated_at, invoke_count)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, 0)`,
      [id, projectId, name, slug, code, now, now]
    );

    return Response.json({ id, name, slug, status: "active", created_at: now }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Delete a function
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    await ensureTable();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    const result = await pool.query("DELETE FROM edge_functions WHERE project_id = $1 AND id = $2", [projectId, id]);
    return Response.json({ ok: (result.rowCount ?? 0) > 0 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function defaultCode(name: string) {
  return `// Edge Function: ${name}
// This runs on every invocation at /api/functions/<projectId>/invoke/<slug>

export default async function handler(req) {
  const body = await req.json().catch(() => ({}));
  
  return Response.json({
    message: "Hello from ${name}!",
    timestamp: new Date().toISOString(),
    body,
  });
}
`;
}

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS edge_functions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      invoke_count BIGINT NOT NULL DEFAULT 0
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_ef_project ON edge_functions (project_id)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_ef_slug ON edge_functions (project_id, slug)");
  tableReady = true;
}
