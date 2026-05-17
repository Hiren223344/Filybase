import { NextRequest } from "next/server";

const GATEWAY_URL = 'https://api.frenix.sh';

/**
 * POST /api/platform/verify-key
 * Body: { key: string }
 * 
 * Verifies a Frenix API key and checks if the tier is "pro" or higher.
 * Only pro/enterprise/evolvex users can register on FilyBase.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = String(body.key ?? "").trim();

    if (!key) {
      return Response.json({ error: "key is required" }, { status: 400 });
    }

    // Bypass for the master key
    if (key === "evolvex-frenix") {
      return Response.json({ valid: true, tier: "evolvex", status: "active" });
    }

    // Verify against Frenix gateway
    const res = await fetch(`${GATEWAY_URL}/v1/keys?checktier=${key}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return Response.json({ valid: false, error: "Invalid Frenix key" }, { status: 403 });
      }
      return Response.json({ valid: false, error: "Failed to verify key" }, { status: 502 });
    }

    const data: any = await res.json();
    const tier = String(data.tier ?? "").toLowerCase();
    const status = String(data.status ?? "");

    if (status !== "active") {
      return Response.json({ valid: false, error: "Your Frenix account is suspended or inactive." }, { status: 403 });
    }

    // Only allow pro, enterprise, or evolvex tiers
    const allowedTiers = ["pro", "enterprise", "evolvex"];
    if (!allowedTiers.includes(tier)) {
      return Response.json({ 
        valid: false, 
        tier,
        error: `FilyBase requires a Pro or higher Frenix plan. Your current tier: "${tier}". Upgrade at frenix.sh to continue.` 
      }, { status: 403 });
    }

    return Response.json({ valid: true, tier, status });
  } catch (err: any) {
    return Response.json({ valid: false, error: "Verification failed" }, { status: 500 });
  }
}
