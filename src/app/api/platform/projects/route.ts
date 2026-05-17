import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { randomBytes } from "node:crypto";
import { ensureMigrated } from "@/lib/auth/migrate";

let tableReady = false;
async function ensureProjectsTable() {
  if (tableReady) return;
  await ensureMigrated();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'auto',
      created_at BIGINT NOT NULL
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_projects_user ON user_projects (user_id)");
  tableReady = true;
}

export async function GET(req: NextRequest) {
  try {
    await ensureProjectsTable();
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
    const result = await pool.query("SELECT * FROM user_projects WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return Response.json({ projects: result.rows });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureProjectsTable();
    const userId = req.headers.get("x-user-id");
    if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ error: "name required" }, { status: 400 });

    const id = randomBytes(12).toString("hex");
    const now = Date.now();
    await pool.query(
      "INSERT INTO user_projects (id, user_id, name, region, created_at) VALUES ($1, $2, $3, $4, $5)",
      [id, userId, name, "auto", now]
    );
    return Response.json({ id, name, region: "auto", created_at: now }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
