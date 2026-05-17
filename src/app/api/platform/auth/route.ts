import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";
import { ensureMigrated } from "@/lib/auth/migrate";
import { hashPassword, verifyPassword, randomId, randomToken, signJwt, verifyJwt } from "@/lib/auth/crypto";

const JWT_SECRET = process.env.PLATFORM_JWT_SECRET || "filybase-platform-secret-change-me";

export async function OPTIONS() { return new Response(null, { status: 204 }); }

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  try {
    if (action === "signup") return await handleSignup(body);
    if (action === "signin") return await handleSignin(body);
    if (action === "me") return await handleMe(req);
    if (action === "signout") return await handleSignout(body);
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

async function handleSignup(body: any) {
  const { email, password, name } = body;
  if (!email || !password) return Response.json({ error: "Email and password required" }, { status: 400 });
  if (String(password).length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const existing = await pool.query("SELECT id FROM platform_users WHERE LOWER(email) = LOWER($1)", [email]);
  if (existing.rows.length > 0) return Response.json({ error: "Email already registered" }, { status: 409 });

  const id = randomId();
  const now = Date.now();
  await pool.query(
    "INSERT INTO platform_users (id, email, password_hash, name, status, role, created_at, updated_at) VALUES ($1,$2,$3,$4,'pending','user',$5,$6)",
    [id, email.toLowerCase(), hashPassword(password), name ?? null, now, now]
  );

  return Response.json({ message: "Account created. Please wait for admin approval.", status: "pending" }, { status: 201 });
}

async function handleSignin(body: any) {
  const { email, password } = body;
  if (!email || !password) return Response.json({ error: "Email and password required" }, { status: 400 });

  const row = await pool.query("SELECT * FROM platform_users WHERE LOWER(email) = LOWER($1)", [email]);
  const user = row.rows[0];
  if (!user) return Response.json({ error: "Invalid email or password" }, { status: 401 });
  if (!verifyPassword(password, user.password_hash)) return Response.json({ error: "Invalid email or password" }, { status: 401 });

  if (user.status === "pending") {
    return Response.json({ error: "pending", message: "Your account is pending approval." }, { status: 403 });
  }
  if (user.status === "rejected" || user.status === "banned") {
    return Response.json({ error: "rejected", message: "Your account has been rejected." }, { status: 403 });
  }

  // Create session token
  const token = signJwt({ sub: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, 60 * 60 * 24 * 7);
  const sessionId = randomId();
  await pool.query(
    "INSERT INTO platform_sessions (id, user_id, token, expires_at, created_at) VALUES ($1,$2,$3,$4,$5)",
    [sessionId, user.id, token, Date.now() + 7 * 24 * 60 * 60 * 1000, Date.now()]
  );

  return Response.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, postgres_url: user.postgres_url },
  });
}

async function handleMe(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const body = await req.json().catch(() => ({}));
  const token = body.token || auth;
  if (!token) return Response.json({ error: "No token" }, { status: 401 });

  try {
    const claims = verifyJwt(token, JWT_SECRET);
    const row = await pool.query("SELECT * FROM platform_users WHERE id = $1", [claims.sub]);
    const user = row.rows[0];
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, postgres_url: user.postgres_url },
    });
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
}

async function handleSignout(body: any) {
  const { token } = body;
  if (token) await pool.query("DELETE FROM platform_sessions WHERE token = $1", [token]);
  return Response.json({ ok: true });
}
