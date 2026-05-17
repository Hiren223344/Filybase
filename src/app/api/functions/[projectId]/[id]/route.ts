import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

// Get a single function (with code)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  try {
    const result = await pool.query(
      "SELECT * FROM edge_functions WHERE project_id = $1 AND id = $2",
      [projectId, id]
    );
    if (result.rows.length === 0) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(result.rows[0]);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Update function code or name
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (typeof body.code === "string") { sets.push(`code = $${idx++}`); vals.push(body.code); }
    if (typeof body.name === "string") { sets.push(`name = $${idx++}`); vals.push(body.name); }
    if (typeof body.status === "string") { sets.push(`status = $${idx++}`); vals.push(body.status); }
    sets.push(`updated_at = $${idx++}`); vals.push(Date.now());

    if (sets.length === 1) return Response.json({ error: "nothing to update" }, { status: 400 });

    vals.push(projectId, id);
    await pool.query(
      `UPDATE edge_functions SET ${sets.join(", ")} WHERE project_id = $${idx++} AND id = $${idx}`,
      vals
    );
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
