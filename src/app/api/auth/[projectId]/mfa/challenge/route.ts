import { NextRequest } from "next/server";
import { AuthError, getCurrentUser, issueSession } from "@/lib/auth/service";
import { getUserById } from "@/lib/auth/store";
import { bearer, clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";
import { createHmac } from "node:crypto";

export async function OPTIONS(req: NextRequest) { return handleOptions(req); }

/**
 * POST /api/auth/<projectId>/mfa/challenge
 * Body: { code: string }
 * Verifies a TOTP code and issues a new session with elevated assurance level.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) throw new AuthError("unauthorized", "Access token required", 401);
    const user = await getCurrentUser(projectId, token);
    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").replace(/\s/g, "");
    if (!code || code.length !== 6) throw new AuthError("invalid_code", "6-digit code required", 400);

    const secret = (user.metadata as any)?._mfa_totp_secret;
    const verified = (user.metadata as any)?._mfa_totp_verified;
    if (!secret || !verified) throw new AuthError("no_factor", "No verified TOTP factor", 400);

    const now = Math.floor(Date.now() / 1000);
    const period = 30;
    let valid = false;
    for (let i = -1; i <= 1; i++) {
      const counter = Math.floor((now + i * period) / period);
      const expected = generateTOTP(secret, counter);
      if (expected === code) { valid = true; break; }
    }
    if (!valid) throw new AuthError("invalid_code", "Invalid TOTP code", 400);

    // Issue a new session with aal2 (authenticator assurance level 2)
    const session = await issueSession(projectId, user, clientIp(req), userAgent(req));
    return json({ ...session, aal: "aal2" }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.toUpperCase()) {
    const idx = alphabet.indexOf(char);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function generateTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(counter, 4);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;
  return code.toString().padStart(6, "0");
}
