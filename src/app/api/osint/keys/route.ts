import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { randomBytes } from "node:crypto";

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

/**
 * GET /api/osint/keys — List all API keys (admin)
 * POST /api/osint/keys — Create a new API key
 * DELETE /api/osint/keys?id=... — Revoke a key
 */
export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const result = await pool.query(
      "SELECT id, key, tier, status, owner_id, name, created_at FROM osint_api_keys ORDER BY created_at DESC"
    );
    return Response.json({ keys: result.rows });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json().catch(() => ({}));
    const id = randomBytes(12).toString("hex");
    const key = `fb_${randomBytes(24).toString("hex")}`;
    const tier = body.tier ?? "free";
    const name = body.name ?? "";
    const ownerId = body.owner_id ?? null;
    const now = Date.now();

    await pool.query(
      "INSERT INTO osint_api_keys (id, key, tier, status, owner_id, name, created_at) VALUES ($1,$2,$3,'active',$4,$5,$6)",
      [id, key, tier, ownerId, name, now]
    );

    return Response.json({ id, key, tier, status: "active", name, created_at: now }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await pool.query("UPDATE osint_api_keys SET status = 'revoked' WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, tier, status } = body;
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    if (tier) { sets.push(`tier = $${idx++}`); vals.push(tier); }
    if (status) { sets.push(`status = $${idx++}`); vals.push(status); }
    if (sets.length === 0) return Response.json({ error: "nothing to update" }, { status: 400 });
    vals.push(id);
    await pool.query(`UPDATE osint_api_keys SET ${sets.join(", ")} WHERE id = $${idx}`, vals);
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS osint_api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      tier TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      owner_id TEXT,
      name TEXT,
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    )
  `);
  tableReady = true;
}
