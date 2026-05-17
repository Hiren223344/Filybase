import { NextRequest } from "next/server";
import { bearer, errorResponse, handleOptions, json } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/service";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const token = bearer(req);
    if (!token) return json({ error: "unauthorized" }, { status: 401 }, req);
    const user = await getCurrentUser(projectId, token);
    return json(
      {
        sub: user.id,
        email: user.email,
        email_verified: user.emailVerified,
        name: user.name ?? undefined,
        picture: user.avatarUrl ?? undefined,
        preferred_username: user.email,
      },
      { status: 200 },
      req
    );
  } catch (err) {
    return errorResponse(err, req);
  }
}
