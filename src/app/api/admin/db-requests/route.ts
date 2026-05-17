import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

/**
 * Manages database provisioning requests.
 * When POSTGRES_PROVIDER=render, users must wait for admin to provide their DB URL.
 * 
 * GET /api/admin/db-requests — List all pending/approved/rejected requests
 * POST /api/admin/db-requests — User submits a request (after signup)
 * PATCH /api/admin/db-requests — Admin approves/rejects with DB URL
 */

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const status = req.nextUrl.searchParams.get("status"); // pending, approved, rejected
    const userId = req.nextUrl.searchParams.get("userId");

    let sql = "SELECT * FROM db_provisioning_requests";
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (userId) { params.push(userId); conditions.push(`user_id = $${params.length}`); }

    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY created_at DESC";

    const result = await pool.query(sql, params);
    return Response.json({ requests: result.rows });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json().catch(() => ({}));
    const { userId, userEmail, projectId, projectName } = body;

    if (!userId || !userEmail || !projectId) {
      return Response.json({ error: "userId, userEmail, projectId required" }, { status: 400 });
    }

    // Check if already requested
    const existing = await pool.query(
      "SELECT * FROM db_provisioning_requests WHERE user_id = $1 AND project_id = $2",
      [userId, projectId]
    );
    if (existing.rows.length > 0) {
      return Response.json({ request: existing.rows[0], message: "Request already exists" });
    }

    const { randomBytes } = await import("node:crypto");
    const id = randomBytes(12).toString("hex");
    const now = Date.now();

    await pool.query(
      `INSERT INTO db_provisioning_requests (id, user_id, user_email, project_id, project_name, status, database_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NULL, $6, $7)`,
      [id, userId, userEmail, projectId, projectName ?? projectId, now, now]
    );

    return Response.json({ id, status: "pending", message: "Request submitted. Our team will review it shortly." }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json().catch(() => ({}));
    const { id, status, databaseUrl, note } = body;

    if (!id || !status) {
      return Response.json({ error: "id and status required" }, { status: 400 });
    }

    if (status === "approved" && !databaseUrl) {
      return Response.json({ error: "databaseUrl required when approving" }, { status: 400 });
    }

    await pool.query(
      `UPDATE db_provisioning_requests SET status = $1, database_url = $2, admin_note = $3, updated_at = $4 WHERE id = $5`,
      [status, databaseUrl ?? null, note ?? null, Date.now(), id]
    );

    return Response.json({ ok: true, message: `Request ${status}` });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS db_provisioning_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      project_id TEXT NOT NULL,
      project_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      database_url TEXT,
      admin_note TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_dbr_user ON db_provisioning_requests (user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_dbr_status ON db_provisioning_requests (status)");
  tableReady = true;
}
