import { NextRequest } from "next/server";
import { handleOptions, json } from "@/lib/auth/http";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return json(
    {
      status: "ok",
      projectId,
      version: "1.0.0",
      server: "filybase-auth",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
    req
  );
}
