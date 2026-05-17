import { NextRequest } from "next/server";
import { signOut } from "@/lib/auth/service";
import { errorResponse, handleOptions, json } from "@/lib/auth/http";

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
    if (body.refresh_token) {
      await signOut(projectId, body.refresh_token);
    }
    return json({ ok: true }, { status: 200 }, req);
  } catch (err) {
    return errorResponse(err, req);
  }
}
