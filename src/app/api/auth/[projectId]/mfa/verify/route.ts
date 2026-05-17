import { NextRequest } from "next/server";
import { bearer, clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/service";
import { patchUser, appendAuditLog } from "@/lib/auth/store";
import { randomId } from "@/lib/auth/crypto";
import { createHmac } from "node:crypto";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/**
 * POST /api/auth/<projectId>/mfa/verify
 * Body: { factorId, code }
 *
 * Verifies a TOTP code against an enrolled factor.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) return json({ error: "unauthorized" }, { status: 401 }, req);

    const user = await getCurrentUser(projectId, token);
    const body = await req.json().catch(() => ({}));
    const factorId = String(body.factorId ?? "");
    const code = String(body.code ?? "");

    if (!factorId || !code) {
      return json({ error: "invalid_request", error_description: "factorId and code are required" }, { status: 400 }, req);
    }

    const factors = (user.appMetadata.mfaFactors as MfaFactor[] | undefined) ?? [];
    const factor = factors.find((f) => f.id === factorId);
    if (!factor) {
      return json({ error: "factor_not_found" }, { status: 404 }, req);
    }

    // Verify TOTP code (check current window ±1)
    const isValid = verifyTotp(factor.secret, code);
    if (!isValid) {
      await appendAuditLog(projectId, {
        id: randomId(),
        projectId,
        timestamp: Date.now(),
        action: "mfa.verify_failed",
        actorId: user.id,
        actorEmail: user.email,
        targetId: factorId,
        targetType: "mfa_factor",
        ip: clientIp(req),
        userAgent: userAgent(req),
        metadata: {},
      });
      return json({ error: "invalid_code", error_description: "TOTP code is invalid" }, { status: 400 }, req);
    }

    // Mark factor as verified if it wasn't already
    if (!factor.verified) {
      const updatedFactors = factors.map((f) =>
        f.id === factorId ? { ...f, verified: true } : f
      );
      await patchUser(projectId, user.id, {
        appMetadata: { ...user.appMetadata, mfaFactors: updatedFactors },
      });
    }

    await appendAuditLog(projectId, {
      id: randomId(),
      projectId,
      timestamp: Date.now(),
      action: "mfa.verify_success",
      actorId: user.id,
      actorEmail: user.email,
      targetId: factorId,
      targetType: "mfa_factor",
      ip: clientIp(req),
      userAgent: userAgent(req),
      metadata: {},
    });

    return json({ success: true, factorId }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}

interface MfaFactor {
  id: string;
  type: "totp";
  secret: string;
  verified: boolean;
  createdAt: number;
}

function verifyTotp(secret: string, code: string, window = 1): boolean {
  const now = Math.floor(Date.now() / 1000);
  const period = 30;
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now + i * period) / period);
    const expected = generateTotp(secret, counter);
    if (expected === code) return true;
  }
  return false;
}

function generateTotp(secret: string, counter: number): string {
  const secretBuffer = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanInput = input.replace(/=+$/, "").toUpperCase();
  const output: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleanInput) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}
