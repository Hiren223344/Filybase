import { NextRequest, NextResponse } from "next/server";

/**
 * Production middleware:
 * - Protects /api/db/* (SQL editor) with ADMIN_SECRET header
 * - Adds security headers to all responses
 * - Blocks /test in production
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProd = process.env.NODE_ENV === "production";

  // Block test page in production
  if (isProd && pathname.startsWith("/test")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Protect SQL editor endpoints — require ADMIN_SECRET
  if (pathname.startsWith("/api/db")) {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      if (isProd) {
        return NextResponse.json({ error: "forbidden", message: "Database API disabled in production without ADMIN_SECRET" }, { status: 403 });
      }
    } else {
      const provided = req.headers.get("x-admin-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
      if (provided !== adminSecret) {
        return NextResponse.json({ error: "unauthorized", message: "Invalid admin secret" }, { status: 401 });
      }
    }
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isProd) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/test/:path*",
    "/test",
  ],
};
