import { NextRequest } from "next/server";
import { refresh } from "@/lib/auth/service";
import { clientIp, errorResponse, handleOptions, json, userAgent } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.refresh_token) {
      return json(
        { error: "invalid_request", error_description: "refresh_token is required" },
        { status: 400 },
        req
      );
    }
    const session = await refresh(
      projectId,
      body.refresh_token,
      clientIp(req),
      userAgent(req)
    );
    return json(session, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
