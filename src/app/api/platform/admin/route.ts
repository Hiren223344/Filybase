import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { ensureMigrated } from "@/lib/auth/migrate";
import { verifyJwt } from "@/lib/auth/crypto";

const JWT_SECRET = process.env.PLATFORM_JWT_SECRET || "filybase-platform-secret-change-me";

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  const claims = verifyJwt(token, JWT_SECRET);
  if (claims.role !== "admin") throw new Error("Admin access required");
  return claims;
}

export async function GET(req: NextRequest) {
  await ensureMigrated();
  try {
    await requireAdmin(req);
    const action = req.nextUrl.searchParams.get("action") ?? "users";

    if (action === "users") {
      const status = req.nextUrl.searchParams.get("status") ?? "pending";
      const result = await pool.query(
        "SELECT id, email, name, status, role, postgres_url, created_at FROM platform_users WHERE status = $1 ORDER BY created_at DESC",
        [status]
      );
      return Response.json({ users: result.rows });
    }

    if (action === "all_users") {
      const result = await pool.query(
        "SELECT id, email, name, status, role, postgres_url, created_at FROM platform_users ORDER BY created_at DESC"
      );
      return Response.json({ users: result.rows });
    }

    if (action === "projects") {
      const result = await pool.query(
        "SELECT p.*, u.email as owner_email FROM platform_projects p LEFT JOIN platform_users u ON p.user_id = u.id ORDER BY p.created_at DESC"
      );
      return Response.json({ projects: result.rows });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: err.message.includes("Unauthorized") ? 401 : 403 });
  }
}

export async function POST(req: NextRequest) {
  await ensureMigrated();
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { action, userId, status: newStatus } = body;

    if (action === "approve") {
      await pool.query("UPDATE platform_users SET status = 'approved', updated_at = $1 WHERE id = $2", [Date.now(), userId]);
      return Response.json({ ok: true, message: "User approved" });
    }

    if (action === "reject") {
      await pool.query("UPDATE platform_users SET status = 'rejected', updated_at = $1 WHERE id = $2", [Date.now(), userId]);
      return Response.json({ ok: true, message: "User rejected" });
    }

    if (action === "ban") {
      await pool.query("UPDATE platform_users SET status = 'banned', updated_at = $1 WHERE id = $2", [Date.now(), userId]);
      return Response.json({ ok: true, message: "User banned" });
    }

    if (action === "make_admin") {
      await pool.query("UPDATE platform_users SET role = 'admin', updated_at = $1 WHERE id = $2", [Date.now(), userId]);
      return Response.json({ ok: true, message: "User promoted to admin" });
    }

    if (action === "delete_project") {
      const { projectId } = body;
      await pool.query("DELETE FROM platform_projects WHERE id = $1", [projectId]);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 403 });
  }
}
