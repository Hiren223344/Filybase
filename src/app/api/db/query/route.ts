import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

const MAX_STORAGE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

// Dangerous statements that should never be run from the dashboard
const BLOCKED_PATTERNS = [
  /DROP\s+DATABASE/i,
  /DROP\s+SCHEMA/i,
  /TRUNCATE\s+auth_/i,
  /DELETE\s+FROM\s+auth_/i,
  /ALTER\s+TABLE\s+auth_/i,
  /DROP\s+TABLE\s+auth_/i,
];

// Write operations that count against quota
const WRITE_PATTERNS = [/^INSERT/i, /^UPDATE/i, /^CREATE/i, /^ALTER/i, /^COPY/i];

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

/**
 * POST /api/db/query
 * Body: { sql: string, params?: any[] }
 * Protected by middleware (requires ADMIN_SECRET in production).
 * Blocks destructive operations on internal auth tables.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sql = String(body.sql ?? "").trim();
    if (!sql) {
      return Response.json({ error: "sql is required" }, { status: 400 });
    }

    // Block dangerous operations on internal tables
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(sql)) {
        return Response.json(
          { error: "Operation blocked: cannot modify internal auth tables from the SQL editor." },
          { status: 403 }
        );
      }
    }

    // Check quota for write operations
    const isWrite = WRITE_PATTERNS.some(p => p.test(sql));
    if (isWrite) {
      const sizeResult = await pool.query("SELECT pg_database_size(current_database()) as size");
      const currentSize = Number(sizeResult.rows[0]?.size ?? 0);
      if (currentSize >= MAX_STORAGE_BYTES) {
        return Response.json(
          { error: "Storage quota exceeded (2 GB). Delete data or upgrade your plan to continue writing." },
          { status: 507 }
        );
      }
    }

    // Enforce query timeout (10s max)
    const client = await pool.connect();
    try {
      await client.query("SET statement_timeout = '10000'");
      const start = Date.now();
      const result = await client.query(sql, body.params ?? []);
      const duration = Date.now() - start;

      return Response.json({
        rows: result.rows?.slice(0, 1000) ?? [], // Cap at 1000 rows
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) ?? [],
        duration,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    // Don't leak internal details in production
    const isProd = process.env.NODE_ENV === "production";
    return Response.json(
      {
        error: err.message,
        ...(isProd ? {} : { detail: err.detail, hint: err.hint, position: err.position }),
      },
      { status: 400 }
    );
  }
}
