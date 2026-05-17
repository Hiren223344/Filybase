import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { verifyJwt } from "@/lib/auth/crypto";

const JWT_SECRET = process.env.PLATFORM_JWT_SECRET || "filybase-platform-secret-change-me";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const claims = verifyJwt(token, JWT_SECRET);

    const body = await req.json().catch(() => ({}));
    if (body.postgres_url !== undefined) {
      await pool.query("UPDATE platform_users SET postgres_url = $1, updated_at = $2 WHERE id = $3", [body.postgres_url || null, Date.now(), claims.sub]);
    }
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 401 });
  }
}
