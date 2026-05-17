import { NextRequest } from "next/server";
import pool from "@/lib/auth/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Execution timeout (ms)
const MAX_EXECUTION_TIME = 10000;

// Blocked globals to prevent abuse
const BLOCKED_GLOBALS = ["process", "require", "eval", "Function", "globalThis", "__dirname", "__filename"];

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function handleInvoke(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> }
) {
  const { projectId, slug } = await params;
  try {
    const result = await pool.query(
      "SELECT * FROM edge_functions WHERE project_id = $1 AND slug = $2 AND status = 'active'",
      [projectId, slug]
    );
    if (result.rows.length === 0) {
      return Response.json(
        { error: "function_not_found", message: `No active function "${slug}"` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const fn = result.rows[0];
    const start = Date.now();

    // Parse request body
    let body: any = null;
    try { body = await req.json(); } catch { body = null; }

    // Build sandboxed request object (no access to raw NextRequest internals)
    const mockReq = Object.freeze({
      method: req.method,
      url: req.url,
      headers: Object.freeze(Object.fromEntries(req.headers.entries())),
      query: Object.freeze(Object.fromEntries(req.nextUrl.searchParams.entries())),
      body,
      json: async () => body,
      text: async () => (body ? JSON.stringify(body) : ""),
    });

    // Build the function with blocked globals nullified
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const blockedAssignments = BLOCKED_GLOBALS.map(g => `const ${g} = undefined;`).join("\n");
    const wrappedCode = `
      "use strict";
      ${blockedAssignments}
      const exports = {};
      const module = { exports };
      ${fn.code.replace(/export\s+default\s+/g, "module.exports.default = ")}
      return module.exports.default || module.exports;
    `;

    // Execute with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAX_EXECUTION_TIME);

    let response: Response;
    try {
      const factory = new AsyncFunction("req", "Response", "console", wrappedCode);
      const safeConsole = Object.freeze({ log: () => {}, warn: () => {}, error: () => {}, info: () => {} });
      const handler = await factory(mockReq, Response, safeConsole);

      if (typeof handler === "function") {
        response = await handler(mockReq);
      } else if (handler instanceof Response) {
        response = handler;
      } else {
        response = Response.json(handler ?? { ok: true });
      }
    } finally {
      clearTimeout(timeout);
    }

    const duration = Date.now() - start;

    // Enforce max execution time
    if (duration > MAX_EXECUTION_TIME) {
      return Response.json(
        { error: "timeout", message: `Function exceeded ${MAX_EXECUTION_TIME}ms limit` },
        { status: 504, headers: CORS_HEADERS }
      );
    }

    // Increment invoke count (fire and forget)
    pool.query(
      "UPDATE edge_functions SET invoke_count = invoke_count + 1 WHERE project_id = $1 AND id = $2",
      [projectId, fn.id]
    ).catch(() => {});

    // Build response with timing + CORS
    const headers = new Headers(response.headers);
    headers.set("x-function-duration", `${duration}ms`);
    headers.set("x-function-name", fn.slug);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));

    return new Response(response.body, { status: response.status, headers });
  } catch (err: any) {
    const isProd = process.env.NODE_ENV === "production";
    return Response.json(
      {
        error: "execution_error",
        message: err.message,
        ...(isProd ? {} : { stack: err.stack?.split("\n").slice(0, 3) }),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export const GET = handleInvoke;
export const POST = handleInvoke;
export const PUT = handleInvoke;
export const DELETE = handleInvoke;
export const PATCH = handleInvoke;
