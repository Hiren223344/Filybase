import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");

    let sql = "SELECT * FROM osint_usage_logs";
    const params: any[] = [];
    if (key) { sql += " WHERE api_key = $1"; params.push(key); }
    sql += " ORDER BY timestamp DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const result = await pool.query(sql, params);

    // Also get aggregate stats
    const statsQuery = key
      ? "SELECT COUNT(*) as total, COUNT(DISTINCT num) as unique_nums FROM osint_usage_logs WHERE api_key = $1"
      : "SELECT COUNT(*) as total, COUNT(DISTINCT num) as unique_nums, COUNT(DISTINCT api_key) as unique_keys FROM osint_usage_logs";
    const stats = await pool.query(statsQuery, key ? [key] : []);

    return Response.json({ logs: result.rows, stats: stats.rows[0] ?? {} });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
