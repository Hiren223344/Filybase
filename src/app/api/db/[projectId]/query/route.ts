import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { getConfig } from "@/lib/auth/store";

const MAX_STORAGE_BYTES = 2 * 1024 * 1024 * 1024;
const WRITE_PATTERNS = [/^INSERT/i, /^UPDATE/i, /^CREATE/i, /^ALTER/i, /^COPY/i];
const BLOCKED_PATTERNS = [/DROP\s+DATABASE/i, /DROP\s+SCHEMA/i, /auth_/i, /edge_functions/i, /osint_/i, /db_provisioning/i];

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey" },
  });
}

/**
 * POST /api/db/<projectId>/query
 * Body: { sql: string, params?: any[] }
 * Headers: Authorization: Bearer <anonKey or serviceRoleKey>
 * 
 * This is how users connect their apps to the database.
 * - anonKey: can only SELECT from user tables (no internal tables)
 * - serviceRoleKey: full access to user tables (CRUD)
 * 
 * Users CANNOT access internal tables (auth_*, edge_functions, osint_*, etc.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    // Authenticate
    const cfg = await getConfig(projectId);
    const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const apiKeyHeader = req.headers.get("apikey") ?? "";
    const token = authHeader || apiKeyHeader;

    if (!token) {
      return json({ error: "unauthorized", message: "Pass your anon key or service role key as Bearer token or apikey header." }, 401);
    }

    let role: "anon" | "service_role";
    if (token === cfg.anonKey) {
      role = "anon";
    } else if (token === cfg.serviceRoleKey) {
      role = "service_role";
    } else {
      return json({ error: "invalid_key", message: "Invalid API key." }, 401);
    }

    // Parse SQL
    const body = await req.json().catch(() => ({}));
    const sql = String(body.sql ?? "").trim();
    if (!sql) return json({ error: "sql is required" }, 400);

    // Block access to internal tables
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(sql)) {
        return json({ error: "forbidden", message: "Cannot access internal system tables." }, 403);
      }
    }

    // Anon key: read-only
    const isWrite = WRITE_PATTERNS.some(p => p.test(sql));
    if (role === "anon" && isWrite) {
      return json({ error: "read_only", message: "Anon key only allows SELECT queries. Use service role key for writes." }, 403);
    }

    // Quota check for writes
    if (isWrite) {
      const sizeResult = await pool.query("SELECT pg_database_size(current_database()) as size");
      if (Number(sizeResult.rows[0]?.size ?? 0) >= MAX_STORAGE_BYTES) {
        return json({ error: "quota_exceeded", message: "Storage quota exceeded (2 GB)." }, 507);
      }
    }

    // Execute with timeout
    const client = await pool.connect();
    try {
      await client.query("SET statement_timeout = '10000'");
      const start = Date.now();
      const result = await client.query(sql, body.params ?? []);
      const duration = Date.now() - start;

      return json({
        data: result.rows?.slice(0, 1000) ?? [],
        count: result.rowCount,
        fields: result.fields?.map(f => f.name) ?? [],
        duration,
      }, 200);
    } finally {
      client.release();
    }
  } catch (err: any) {
    return json({ error: "query_error", message: err.message }, 400);
  }
}

function json(body: object, status: number) {
  return Response.json(body, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
