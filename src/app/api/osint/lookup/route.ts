import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { checkRateLimit, rateLimitResponse } from "@/lib/auth/rate-limit";

const TARGET_URL = "https://nv6.ek4nsh.in/api/search";
const TARGET_KEY = "hiren";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key" },
  });
}

/**
 * GET /api/osint/lookup?num=<phone>&key=<apiKey>
 * 
 * Validates the API key against the project's apiKeys collection,
 * applies tier-based rate limiting, then proxies to the OSINT backend.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const key = url.searchParams.get("key") || req.headers.get("x-api-key");
  const num = url.searchParams.get("num");

  if (!key) {
    return json({ error: "Missing API key. Pass ?key= or x-api-key header." }, 401);
  }
  if (!num) {
    return json({ error: "Missing num parameter." }, 400);
  }

  try {
    // Ensure API keys table exists
    await ensureApiKeysTable();

    // Validate key and get tier
    const apiKey = await validateKey(key);
    if (!apiKey) {
      return json({ error: "Invalid API Key" }, 403);
    }
    if (apiKey.status !== "active") {
      return json({ error: "Account Restricted", message: "Your API key is suspended or revoked." }, 403);
    }

    // Rate limiting based on tier
    const tier = apiKey.tier.toLowerCase();
    if (tier === "free") {
      // Free: 5 requests per minute
      const rl = checkRateLimit(`osint:${key}`, 5, 60000);
      const blocked = rateLimitResponse(rl);
      if (blocked) return blocked;
    } else if (tier === "pro") {
      // Pro: 30 requests per minute
      const rl = checkRateLimit(`osint:${key}`, 30, 60000);
      const blocked = rateLimitResponse(rl);
      if (blocked) return blocked;
    } else if (tier === "enterprise" || tier === "unlimited") {
      // No rate limit
    } else {
      // Unknown tier — default 10/min
      const rl = checkRateLimit(`osint:${key}`, 10, 60000);
      const blocked = rateLimitResponse(rl);
      if (blocked) return blocked;
    }

    // Proxy to OSINT backend
    const targetUrl = `${TARGET_URL}?key=${TARGET_KEY}&num=${encodeURIComponent(num)}`;
    const response = await fetch(targetUrl, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return json({ error: "Upstream error", status: response.status }, 502);
    }

    const data = await response.json();

    // Log usage
    await pool.query(
      "INSERT INTO osint_usage_logs (api_key, num, tier, ip, timestamp) VALUES ($1, $2, $3, $4, $5)",
      [key, num, apiKey.tier, req.headers.get("x-forwarded-for") ?? "unknown", Date.now()]
    ).catch(() => {}); // fire and forget

    return json(data as object);
  } catch (err: any) {
    return json({ error: "Internal Server Error" }, 500);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(body: object, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

interface ApiKeyRecord {
  id: string;
  key: string;
  tier: string;
  status: string;
  owner_id: string | null;
  created_at: number;
}

async function validateKey(key: string): Promise<ApiKeyRecord | null> {
  const result = await pool.query(
    "SELECT * FROM osint_api_keys WHERE key = $1",
    [key]
  );
  return result.rows[0] ?? null;
}

let tableReady = false;
async function ensureApiKeysTable() {
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS osint_usage_logs (
      id SERIAL PRIMARY KEY,
      api_key TEXT NOT NULL,
      num TEXT NOT NULL,
      tier TEXT NOT NULL,
      ip TEXT,
      timestamp BIGINT NOT NULL
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_osint_logs_key ON osint_usage_logs (api_key, timestamp DESC)");
  tableReady = true;
}
