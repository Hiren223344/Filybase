import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

/**
 * GET /api/admin/db-status?userId=...&projectId=...
 * Returns the provisioning status for a user's project.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const projectId = req.nextUrl.searchParams.get("projectId");

  if (!userId || !projectId) {
    return Response.json({ error: "userId and projectId required" }, { status: 400 });
  }

  const provider = process.env.POSTGRES_PROVIDER || "render";

  // If local provider, always approved (automated)
  if (provider === "local") {
    // Check if already provisioned in DB
    try {
      const result = await pool.query(
        "SELECT * FROM db_provisioning_requests WHERE user_id = $1 AND project_id = $2 AND status = 'approved' ORDER BY created_at DESC LIMIT 1",
        [userId, projectId]
      );
      if (result.rows.length > 0) {
        return Response.json({ status: "approved", provider: "local", databaseUrl: result.rows[0].database_url });
      }
      // Not yet provisioned — trigger auto-provision
      return Response.json({ status: "not_requested", provider: "local", autoProvision: true });
    } catch {
      // Table might not exist yet — that's fine, means not provisioned
      return Response.json({ status: "not_requested", provider: "local", autoProvision: true });
    }
  }

  // For render provider, check the request status
  try {
    const result = await pool.query(
      "SELECT * FROM db_provisioning_requests WHERE user_id = $1 AND project_id = $2 ORDER BY created_at DESC LIMIT 1",
      [userId, projectId]
    );

    if (result.rows.length === 0) {
      return Response.json({ status: "not_requested", provider: "render" });
    }

    const req_row = result.rows[0];
    return Response.json({
      status: req_row.status,
      provider: "render",
      databaseUrl: req_row.status === "approved" ? req_row.database_url : null,
      adminNote: req_row.admin_note,
      requestedAt: req_row.created_at,
      updatedAt: req_row.updated_at,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
