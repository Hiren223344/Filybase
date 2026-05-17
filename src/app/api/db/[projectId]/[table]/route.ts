import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { getConfig } from "@/lib/auth/store";

const INTERNAL_TABLES = ['auth_users', 'auth_config', 'auth_refresh_tokens', 'auth_oauth_clients', 'auth_oauth_codes', 'auth_audit_logs', 'edge_functions', 'osint_api_keys', 'osint_usage_logs', 'db_provisioning_requests'];

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey" },
  });
}

/**
 * REST API for user tables:
 * GET    /api/db/<projectId>/<table>?limit=50&offset=0&order=id.desc&<column>=eq.<value>
 * POST   /api/db/<projectId>/<table>  — Insert row(s)
 * PATCH  /api/db/<projectId>/<table>?id=eq.<value>  — Update rows matching filter
 * DELETE /api/db/<projectId>/<table>?id=eq.<value>  — Delete rows matching filter
 */

async function authenticate(req: NextRequest, projectId: string): Promise<{ role: "anon" | "service_role" } | Response> {
  const cfg = await getConfig(projectId);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("apikey") || "";
  if (!token) return json({ error: "unauthorized" }, 401);
  if (token === cfg.anonKey) return { role: "anon" };
  if (token === cfg.serviceRoleKey) return { role: "service_role" };
  return json({ error: "invalid_key" }, 401);
}

function checkTable(table: string): Response | null {
  if (INTERNAL_TABLES.includes(table) || table.startsWith('auth_') || table.startsWith('pg_')) {
    return json({ error: "forbidden", message: "Cannot access system tables." }, 403);
  }
  // Sanitize table name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    return json({ error: "invalid_table", message: "Invalid table name." }, 400);
  }
  return null;
}

// GET — Select rows
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; table: string }> }
) {
  const { projectId, table } = await params;
  const auth = await authenticate(req, projectId);
  if (auth instanceof Response) return auth;
  const blocked = checkTable(table);
  if (blocked) return blocked;

  const url = req.nextUrl;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 1000);
  const offset = Number(url.searchParams.get("offset") ?? "0");
  const order = url.searchParams.get("order") ?? ""; // e.g. "created_at.desc"
  const select = url.searchParams.get("select") ?? "*";

  // Build WHERE from query params (PostgREST-style filters)
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;
  for (const [key, val] of url.searchParams.entries()) {
    if (['limit', 'offset', 'order', 'select'].includes(key)) continue;
    const match = val.match(/^(eq|neq|gt|gte|lt|lte|like|ilike)\.(.+)$/);
    if (match) {
      const [, op, v] = match;
      const ops: Record<string, string> = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE' };
      conditions.push(`"${key}" ${ops[op]} $${idx++}`);
      values.push(op === 'like' || op === 'ilike' ? `%${v}%` : v);
    }
  }

  let sql = `SELECT ${select} FROM "${table}"`;
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
  if (order) {
    const [col, dir] = order.split('.');
    sql += ` ORDER BY "${col}" ${dir === 'desc' ? 'DESC' : 'ASC'}`;
  }
  sql += ` LIMIT $${idx++} OFFSET $${idx}`;
  values.push(limit, offset);

  try {
    const result = await pool.query(sql, values);
    return json({ data: result.rows, count: result.rowCount }, 200);
  } catch (err: any) {
    return json({ error: err.message }, 400);
  }
}

// POST — Insert
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; table: string }> }
) {
  const { projectId, table } = await params;
  const auth = await authenticate(req, projectId);
  if (auth instanceof Response) return auth;
  if (auth.role === "anon") return json({ error: "read_only", message: "Use service role key for writes." }, 403);
  const blocked = checkTable(table);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body) ? body : [body];
  if (rows.length === 0) return json({ error: "empty body" }, 400);

  const columns = Object.keys(rows[0]);
  const placeholders = rows.map((_, ri) =>
    `(${columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(',')})`
  ).join(',');
  const values = rows.flatMap(r => columns.map(c => r[c] ?? null));

  try {
    const result = await pool.query(
      `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES ${placeholders} RETURNING *`,
      values
    );
    return json({ data: result.rows, count: result.rowCount }, 201);
  } catch (err: any) {
    return json({ error: err.message }, 400);
  }
}

// PATCH — Update
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; table: string }> }
) {
  const { projectId, table } = await params;
  const auth = await authenticate(req, projectId);
  if (auth instanceof Response) return auth;
  if (auth.role === "anon") return json({ error: "read_only" }, 403);
  const blocked = checkTable(table);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const columns = Object.keys(body);
  if (columns.length === 0) return json({ error: "empty body" }, 400);

  // Build WHERE from query params
  const url = req.nextUrl;
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  // SET clause
  const sets = columns.map(c => `"${c}" = $${idx++}`);
  values.push(...columns.map(c => body[c]));

  // WHERE clause
  for (const [key, val] of url.searchParams.entries()) {
    const match = val.match(/^(eq|neq|gt|gte|lt|lte)\.(.+)$/);
    if (match) {
      const [, op, v] = match;
      const ops: Record<string, string> = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' };
      conditions.push(`"${key}" ${ops[op]} $${idx++}`);
      values.push(v);
    }
  }

  if (conditions.length === 0) return json({ error: "Filters required for PATCH (to prevent accidental full-table update)." }, 400);

  try {
    const result = await pool.query(
      `UPDATE "${table}" SET ${sets.join(',')} WHERE ${conditions.join(' AND ')} RETURNING *`,
      values
    );
    return json({ data: result.rows, count: result.rowCount }, 200);
  } catch (err: any) {
    return json({ error: err.message }, 400);
  }
}

// DELETE
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; table: string }> }
) {
  const { projectId, table } = await params;
  const auth = await authenticate(req, projectId);
  if (auth instanceof Response) return auth;
  if (auth.role === "anon") return json({ error: "read_only" }, 403);
  const blocked = checkTable(table);
  if (blocked) return blocked;

  const url = req.nextUrl;
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, val] of url.searchParams.entries()) {
    const match = val.match(/^(eq|neq|gt|gte|lt|lte)\.(.+)$/);
    if (match) {
      const [, op, v] = match;
      const ops: Record<string, string> = { eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' };
      conditions.push(`"${key}" ${ops[op]} $${idx++}`);
      values.push(v);
    }
  }

  if (conditions.length === 0) return json({ error: "Filters required for DELETE." }, 400);

  try {
    const result = await pool.query(
      `DELETE FROM "${table}" WHERE ${conditions.join(' AND ')} RETURNING *`,
      values
    );
    return json({ data: result.rows, count: result.rowCount }, 200);
  } catch (err: any) {
    return json({ error: err.message }, 400);
  }
}

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Access-Control-Allow-Origin": "*" } });
}
