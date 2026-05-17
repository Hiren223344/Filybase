// Simple in-memory sliding window rate limiter.
// For production at scale, swap with Redis-backed implementation.

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g. "signup:192.168.1.1")
 * @param maxRequests - Max requests per window
 * @param windowMs - Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let win = store.get(key);

  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }

  win.count++;

  if (win.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: win.resetAt };
  }

  return { allowed: true, remaining: maxRequests - win.count, resetAt: win.resetAt };
}

/**
 * Express-style rate limit check that returns a Response if blocked.
 */
export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.allowed) return null;
  return Response.json(
    {
      error: "rate_limit_exceeded",
      message: "Too many requests. Please try again later.",
      retry_after: Math.ceil((result.resetAt - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    }
  );
}
