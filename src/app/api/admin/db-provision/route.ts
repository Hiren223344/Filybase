import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { randomBytes } from "node:crypto";

/**
 * POST /api/admin/db-provision
 * Body: { userId, userEmail, projectId, projectName }
 * 
 * When POSTGRES_PROVIDER=local, this auto-provisions a schema for the user
 * by creating a dedicated schema in the existing database.
 * 
 * When POSTGRES_PROVIDER=render, this just creates the request (manual flow).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, userEmail, projectId, projectName } = body;

    if (!userId || !userEmail || !projectId) {
      return Response.json({ error: "userId, userEmail, projectId required" }, { status: 400 });
    }

    const provider = process.env.POSTGRES_PROVIDER || "render";

    if (provider === "local") {
      // AUTO-PROVISION: Create a dedicated schema for this project
      const schemaName = `project_${projectId.replace(/[^a-z0-9_]/gi, "_").slice(0, 40)}`;
      
      // Create schema
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // Create a dedicated role (or just use the schema with the main connection)
      // For simplicity, we give them the same DATABASE_URL but with a search_path set to their schema
      const dbUrl = process.env.DATABASE_URL!;
      const userDbUrl = `${dbUrl}?options=-c%20search_path%3D${schemaName}%2Cpublic`;

      // Record the provisioning
      await ensureTable();
      const id = randomBytes(12).toString("hex");
      const now = Date.now();

      // Check if already provisioned
      const existing = await pool.query(
        "SELECT * FROM db_provisioning_requests WHERE user_id = $1 AND project_id = $2 AND status = 'approved'",
        [userId, projectId]
      );
      if (existing.rows.length > 0) {
        return Response.json({
          status: "approved",
          provider: "local",
          databaseUrl: existing.rows[0].database_url,
          schema: schemaName,
          message: "Already provisioned",
        });
      }

      await pool.query(
        `INSERT INTO db_provisioning_requests (id, user_id, user_email, project_id, project_name, status, database_url, admin_note, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'approved', $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [id, userId, userEmail, projectId, projectName ?? projectId, userDbUrl, `Auto-provisioned schema: ${schemaName}`, now, now]
      );

      return Response.json({
        status: "approved",
        provider: "local",
        databaseUrl: userDbUrl,
        schema: schemaName,
        message: "Database auto-provisioned successfully",
      });
    }

    // RENDER FLOW: Submit request for manual approval
    await ensureTable();
    const existing = await pool.query(
      "SELECT * FROM db_provisioning_requests WHERE user_id = $1 AND project_id = $2",
      [userId, projectId]
    );
    if (existing.rows.length > 0) {
      return Response.json({ status: existing.rows[0].status, message: "Request already exists" });
    }

    const id = randomBytes(12).toString("hex");
    const now = Date.now();
    await pool.query(
      `INSERT INTO db_provisioning_requests (id, user_id, user_email, project_id, project_name, status, database_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NULL, $6, $7)`,
      [id, userId, userEmail, projectId, projectName ?? projectId, now, now]
    );

    return Response.json({ status: "pending", message: "Request submitted. Our team will review it shortly." }, { status: 201 });
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
