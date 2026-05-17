import { NextRequest } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth/service";
import { patchUser, appendAuditLog } from "@/lib/auth/store";
import { randomId, randomToken, b64url } from "@/lib/auth/crypto";
import { bearer, clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";
import { createHmac } from "node:crypto";

export async function OPTIONS(req: NextRequest) { return handleOptions(req); }

/**
 * POST /api/auth/<projectId>/mfa
 * Enroll a new TOTP factor. Returns the secret and otpauth URI.
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

    // Generate a 20-byte TOTP secret
    const { randomBytes } = await import("node:crypto");
    const secretBytes = randomBytes(20);
    const secret = base32Encode(secretBytes);
    const issuer = "FilyBase";
    const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // Store the secret in user metadata (pending verification)
    await patchUser(projectId, user.id, {
      metadata: { ...user.metadata, _mfa_totp_secret: secret, _mfa_totp_verified: false },
    });

    return json({ secret, otpauth_uri: otpauthUri, type: "totp" }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

/**
 * PUT /api/auth/<projectId>/mfa
 * Verify TOTP enrollment by providing a valid OTP code.
 * Body: { code: string }
 */
export async function PUT(
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
    if (!secret) throw new AuthError("no_factor", "No TOTP factor enrolled. Call POST /mfa first.", 400);

    // Verify the TOTP code (check current and previous window)
    const now = Math.floor(Date.now() / 1000);
    const period = 30;
    let valid = false;
    for (let i = -1; i <= 1; i++) {
      const counter = Math.floor((now + i * period) / period);
      const expected = generateTOTP(secret, counter);
      if (expected === code) { valid = true; break; }
    }
    if (!valid) throw new AuthError("invalid_code", "Invalid TOTP code", 400);

    await patchUser(projectId, user.id, {
      metadata: { ...user.metadata, _mfa_totp_verified: true },
    });

    await appendAuditLog(projectId, {
      id: randomId(), projectId, timestamp: Date.now(), action: "user.mfa_enrolled",
      actorId: user.id, actorEmail: user.email, targetId: user.id, targetType: "user",
      ip: clientIp(req), userAgent: userAgent(req), metadata: { factor: "totp" },
    });

    return json({ message: "TOTP factor verified and enrolled.", verified: true }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

/**
 * DELETE /api/auth/<projectId>/mfa
 * Unenroll TOTP factor.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) throw new AuthError("unauthorized", "Access token required", 401);
    const user = await getCurrentUser(projectId, token);
    const meta = { ...user.metadata } as Record<string, unknown>;
    delete meta._mfa_totp_secret;
    delete meta._mfa_totp_verified;
    await patchUser(projectId, user.id, { metadata: meta });
    return json({ message: "TOTP factor removed." }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

// ─── TOTP Helpers ────────────────────────────────────────────────────────────

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
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
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
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
