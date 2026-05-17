import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

export async function GET() {
  try {
    // Only show user-created tables, hide internal auth_* tables
    const result = await pool.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name NOT LIKE 'auth_%'
      ORDER BY table_name
    `);
    return Response.json({ tables: result.rows });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
