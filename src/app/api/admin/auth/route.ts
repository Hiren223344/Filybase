import { NextRequest } from "next/server";

/**
 * POST /api/admin/auth
 * Body: { username, password }
 * Returns a simple admin token if credentials match.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;

  const validUser = process.env.ADMIN_USERNAME || "Hiren2012";
  const validPass = process.env.ADMIN_PASSWORD || "HelloHiren";

  if (username === validUser && password === validPass) {
    // Simple token — in production use a proper JWT
    const token = Buffer.from(`${validUser}:${Date.now()}`).toString("base64");
    return Response.json({ token, message: "Authenticated" });
  }

  return Response.json({ error: "Invalid credentials" }, { status: 401 });
}
