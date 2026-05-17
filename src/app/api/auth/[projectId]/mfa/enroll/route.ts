import { NextRequest } from "next/server";
import { bearer, clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/service";
import { patchUser, getConfig, appendAuditLog } from "@/lib/auth/store";
import { randomId, randomToken, b64url } from "@/lib/auth/crypto";
import { randomBytes } from "node:crypto";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/**
 * POST /api/auth/<projectId>/mfa/enroll
 * Enrolls a new TOTP factor. Returns the secret and a provisioning URI.
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
    const cfg = await getConfig(projectId);

    if (!cfg.mfaConfig.enabled || !cfg.mfaConfig.totpEnabled) {
      return json({ error: "mfa_disabled", error_description: "MFA is not enabled for this project" }, { status: 400 }, req);
    }

    // Generate a 20-byte secret (base32 encoded for TOTP apps)
    const secretBytes = randomBytes(20);
    const secret = base32Encode(secretBytes);
    const factorId = randomId();

    // Store the pending factor on user metadata
    const factors = (user.appMetadata.mfaFactors as MfaFactor[] | undefined) ?? [];
    if (factors.length >= cfg.mfaConfig.maxFactors) {
      return json({ error: "max_factors", error_description: "Maximum MFA factors reached" }, { status: 400 }, req);
    }

    const newFactor: MfaFactor = {
      id: factorId,
      type: "totp",
      secret,
      verified: false,
      createdAt: Date.now(),
    };

    await patchUser(projectId, user.id, {
      appMetadata: {
        ...user.appMetadata,
        mfaFactors: [...factors, newFactor],
      },
    });

    // Build otpauth URI
    const issuer = encodeURIComponent(cfg.jwtIssuer);
    const accountName = encodeURIComponent(user.email);
    const otpauthUri = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    await appendAuditLog(projectId, {
      id: randomId(),
      projectId,
      timestamp: Date.now(),
      action: "mfa.factor_enrolled",
      actorId: user.id,
      actorEmail: user.email,
      targetId: factorId,
      targetType: "mfa_factor",
      ip: clientIp(req),
      userAgent: userAgent(req),
      metadata: { type: "totp" },
    });

    return json(
      {
        id: factorId,
        type: "totp",
        totp: {
          secret,
          uri: otpauthUri,
          qr: otpauthUri, // clients can render QR from this URI
        },
      },
      { status: 200 },
      req
    );
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

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}
