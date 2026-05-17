/**
 * FilyBase Auth Client SDK
 * 
 * Zero-dependency client for browser and Node.js apps.
 * 
 * @example
 * ```ts
 * import { createFilyAuth } from '@filybase/sdk/auth'
 * 
 * const auth = createFilyAuth({
 *   baseUrl: 'https://filybase.io/api/auth/my-project',
 *   anonKey: 'fb_anon_...'
 * })
 * 
 * const { data, error } = await auth.signUp({ email, password, name })
 * ```
 */

export interface FilyAuthConfig {
  /** Full base URL to the project auth API */
  baseUrl: string;
  /** Optional anon key sent as `apikey` header */
  anonKey?: string;
  /** Auto-persist session to localStorage (browser only). Default true. */
  persistSession?: boolean;
  /** Storage key name. Default "filybase-auth-session" */
  storageKey?: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
  refreshToken: string;
  user: Record<string, unknown>;
}

export interface AuthError {
  error: string;
  error_description: string;
}

export type Result<T> = { data: T; error: null } | { data: null; error: AuthError };

function isServer(): boolean {
  return typeof window === "undefined";
}

export function createFilyAuth(config: FilyAuthConfig) {
  const {
    baseUrl,
    anonKey,
    persistSession = true,
    storageKey = "filybase-auth-session",
  } = config;

  let currentSession: AuthSession | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Restore from storage on init
  if (!isServer() && persistSession) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) currentSession = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  function saveSession(session: AuthSession | null) {
    currentSession = session;
    if (!isServer() && persistSession) {
      if (session) localStorage.setItem(storageKey, JSON.stringify(session));
      else localStorage.removeItem(storageKey);
    }
    scheduleRefresh(session);
  }

  function scheduleRefresh(session: AuthSession | null) {
    if (refreshTimer) clearTimeout(refreshTimer);
    if (!session) return;
    const ms = (session.expiresIn - 60) * 1000;
    if (ms > 0) {
      refreshTimer = setTimeout(() => { refreshSession().catch(() => {}); }, ms);
    }
  }

  async function request<T>(path: string, opts: RequestInit = {}): Promise<Result<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(anonKey ? { apikey: anonKey } : {}),
      ...((opts.headers as Record<string, string>) ?? {}),
    };
    try {
      const res = await fetch(`${baseUrl}${path}`, { ...opts, headers });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json as AuthError };
      return { data: json as T, error: null };
    } catch (err) {
      return { data: null, error: { error: "network_error", error_description: (err as Error).message } };
    }
  }

  async function signUp(input: { email: string; password: string; name?: string; metadata?: Record<string, unknown> }): Promise<Result<AuthSession>> {
    const result = await request<AuthSession>("/signup", { method: "POST", body: JSON.stringify(input) });
    if (result.data) saveSession(result.data);
    return result;
  }

  async function signIn(input: { email: string; password: string }): Promise<Result<AuthSession>> {
    const result = await request<AuthSession>("/signin", { method: "POST", body: JSON.stringify(input) });
    if (result.data) saveSession(result.data);
    return result;
  }

  async function refreshSession(): Promise<Result<AuthSession>> {
    if (!currentSession?.refreshToken) {
      return { data: null, error: { error: "no_session", error_description: "No active session" } };
    }
    const result = await request<AuthSession>("/refresh", { method: "POST", body: JSON.stringify({ refresh_token: currentSession.refreshToken }) });
    if (result.data) saveSession(result.data);
    else saveSession(null);
    return result;
  }

  async function signOut(): Promise<void> {
    if (currentSession?.refreshToken) {
      await request("/signout", { method: "POST", body: JSON.stringify({ refresh_token: currentSession.refreshToken }) });
    }
    saveSession(null);
  }

  async function getUser(): Promise<Result<Record<string, unknown>>> {
    if (!currentSession?.accessToken) {
      return { data: null, error: { error: "no_session", error_description: "Not authenticated" } };
    }
    return request("/user", { method: "GET", headers: { Authorization: `Bearer ${currentSession.accessToken}` } });
  }

  async function updateUser(patch: Record<string, unknown>): Promise<Result<Record<string, unknown>>> {
    if (!currentSession?.accessToken) {
      return { data: null, error: { error: "no_session", error_description: "Not authenticated" } };
    }
    return request("/user", { method: "PATCH", headers: { Authorization: `Bearer ${currentSession.accessToken}` }, body: JSON.stringify(patch) });
  }

  function getSession(): AuthSession | null { return currentSession; }
  function getAccessToken(): string | null { return currentSession?.accessToken ?? null; }

  scheduleRefresh(currentSession);

  return { signUp, signIn, signOut, refreshSession, getUser, updateUser, getSession, getAccessToken };
}
