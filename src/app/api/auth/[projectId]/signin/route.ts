import { NextRequest } from "next/server";
import { signIn } from "@/lib/auth/service";
import { clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";
import { checkRateLimit, rateLimitResponse } from "@/lib/auth/rate-limit";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    // Rate limit: 30 sign-in attempts per IP per 15 minutes
    const ip = clientIp(req) ?? "unknown";
    const rl = checkRateLimit(`signin:${projectId}:${ip}`, 30, 900000);
    const blocked = rateLimitResponse(rl);
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const session = await signIn({
      projectId,
      email: body.email,
      password: body.password,
      ip: clientIp(req),
      userAgent: userAgent(req),
    });
    return json(session, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
