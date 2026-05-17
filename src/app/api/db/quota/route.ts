import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

const MAX_STORAGE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB per project

/**
 * GET /api/db/quota?projectId=...
 * Returns current storage usage and quota for a project schema.
 */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");

  try {
    // Get total database size
    const totalResult = await pool.query("SELECT pg_database_size(current_database()) as size");
    const totalSize = Number(totalResult.rows[0]?.size ?? 0);

    // Get per-schema size if projectId provided
    let projectSize = 0;
    if (projectId) {
      const schemaName = `project_${projectId.replace(/[^a-z0-9_]/gi, "_").slice(0, 40)}`;
      const schemaResult = await pool.query(
        `SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0) as size
         FROM pg_tables WHERE schemaname = $1`,
        [schemaName]
      );
      projectSize = Number(schemaResult.rows[0]?.size ?? 0);
    }

    // Get table-level breakdown for the public schema (user tables only)
    const tablesResult = await pool.query(`
      SELECT tablename as name,
             pg_total_relation_size(quote_ident('public') || '.' || quote_ident(tablename)) as size,
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') as columns
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT LIKE 'auth_%' AND tablename NOT LIKE 'edge_%' AND tablename NOT LIKE 'osint_%' AND tablename NOT LIKE 'db_%'
      ORDER BY size DESC
    `);

    return Response.json({
      quota: {
        maxBytes: MAX_STORAGE_BYTES,
        maxFormatted: "2 GB",
        usedBytes: totalSize,
        usedFormatted: formatBytes(totalSize),
        percentUsed: Math.round((totalSize / MAX_STORAGE_BYTES) * 100),
        remaining: Math.max(0, MAX_STORAGE_BYTES - totalSize),
        remainingFormatted: formatBytes(Math.max(0, MAX_STORAGE_BYTES - totalSize)),
        exceeded: totalSize >= MAX_STORAGE_BYTES,
      },
      projectSize: projectId ? { bytes: projectSize, formatted: formatBytes(projectSize) } : null,
      tables: tablesResult.rows.map(r => ({
        name: r.name,
        size: Number(r.size),
        sizeFormatted: formatBytes(Number(r.size)),
        columns: Number(r.columns),
      })),
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
