/**
 * @filybase/sdk
 * 
 * Official FilyBase client SDK for Auth, Database, and Edge Functions.
 * 
 * @example
 * ```ts
 * import { createFilybase } from '@filybase/sdk'
 * 
 * const fily = createFilybase({
 *   url: 'https://filybase.io/api',
 *   projectId: 'my-project',
 *   anonKey: 'fb_anon_...'
 * })
 * 
 * // Auth
 * await fily.auth.signUp({ email, password, name })
 * await fily.auth.signIn({ email, password })
 * 
 * // Database
 * const todos = await fily.db.from('todos').select()
 * await fily.db.from('todos').insert({ title: 'Hello' })
 * 
 * // Functions
 * const result = await fily.functions.invoke('my-function', { body: { key: 'value' } })
 * ```
 */

export { createFilyAuth } from './auth';
export type { FilyAuthConfig, AuthSession, AuthError, Result } from './auth';

export interface FilybaseConfig {
  /** Base URL (e.g. "https://filybase.io/api") */
  url: string;
  /** Project ID */
  projectId: string;
  /** Public anon key */
  anonKey?: string;
  /** Service role key (server-side only) */
  serviceRoleKey?: string;
}

export function createFilybase(config: FilybaseConfig) {
  const { url, projectId, anonKey, serviceRoleKey } = config;
  const authUrl = `${url}/auth/${projectId}`;
  const dbUrl = `${url}/db/${projectId}`;
  const fnUrl = `${url}/functions/${projectId}`;
  const key = serviceRoleKey || anonKey || '';

  const headers = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(key ? { apikey: key } : {}),
  });

  // ─── Auth ────────────────────────────────────────────────────────────────
  const auth = {
    async signUp(input: { email: string; password: string; name?: string; metadata?: Record<string, unknown> }) {
      return fetchJson(`${authUrl}/signup`, { method: 'POST', body: JSON.stringify(input) });
    },
    async signIn(input: { email: string; password: string }) {
      return fetchJson(`${authUrl}/signin`, { method: 'POST', body: JSON.stringify(input) });
    },
    async signOut(refreshToken: string) {
      return fetchJson(`${authUrl}/signout`, { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
    },
    async refresh(refreshToken: string) {
      return fetchJson(`${authUrl}/refresh`, { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
    },
    async getUser(accessToken: string) {
      return fetchJson(`${authUrl}/user`, { method: 'GET', headers: { ...headers(), Authorization: `Bearer ${accessToken}` } });
    },
  };

  // ─── Database ────────────────────────────────────────────────────────────
  function from(table: string) {
    let filters: string[] = [];
    let orderStr = '';
    let limitNum = 50;
    let offsetNum = 0;

    const builder = {
      eq(col: string, val: string | number) { filters.push(`${col}=eq.${val}`); return builder; },
      neq(col: string, val: string | number) { filters.push(`${col}=neq.${val}`); return builder; },
      gt(col: string, val: string | number) { filters.push(`${col}=gt.${val}`); return builder; },
      gte(col: string, val: string | number) { filters.push(`${col}=gte.${val}`); return builder; },
      lt(col: string, val: string | number) { filters.push(`${col}=lt.${val}`); return builder; },
      lte(col: string, val: string | number) { filters.push(`${col}=lte.${val}`); return builder; },
      like(col: string, val: string) { filters.push(`${col}=like.${val}`); return builder; },
      order(col: string, dir: 'asc' | 'desc' = 'asc') { orderStr = `${col}.${dir}`; return builder; },
      limit(n: number) { limitNum = n; return builder; },
      offset(n: number) { offsetNum = n; return builder; },

      async select() {
        const params = new URLSearchParams();
        filters.forEach(f => { const [k, v] = f.split('='); params.set(k, v); });
        if (orderStr) params.set('order', orderStr);
        params.set('limit', String(limitNum));
        params.set('offset', String(offsetNum));
        return fetchJson(`${dbUrl}/${table}?${params}`, { method: 'GET' });
      },

      async insert(data: Record<string, unknown> | Record<string, unknown>[]) {
        return fetchJson(`${dbUrl}/${table}`, { method: 'POST', body: JSON.stringify(data) });
      },

      async update(data: Record<string, unknown>) {
        const params = new URLSearchParams();
        filters.forEach(f => { const [k, v] = f.split('='); params.set(k, v); });
        return fetchJson(`${dbUrl}/${table}?${params}`, { method: 'PATCH', body: JSON.stringify(data) });
      },

      async delete() {
        const params = new URLSearchParams();
        filters.forEach(f => { const [k, v] = f.split('='); params.set(k, v); });
        return fetchJson(`${dbUrl}/${table}?${params}`, { method: 'DELETE' });
      },
    };

    return builder;
  }

  const db = { from, async query(sql: string, params?: unknown[]) { return fetchJson(`${dbUrl}/query`, { method: 'POST', body: JSON.stringify({ sql, params }) }); } };

  // ─── Functions ───────────────────────────────────────────────────────────
  const functions = {
    async invoke(slug: string, opts?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
      return fetchJson(`${fnUrl}/invoke/${slug}`, {
        method: opts?.method || 'POST',
        ...(opts?.body ? { body: JSON.stringify(opts.body) } : {}),
        headers: { ...headers(), ...(opts?.headers ?? {}) },
      });
    },
  };

  // ─── Fetch helper ────────────────────────────────────────────────────────
  async function fetchJson(url: string, opts: RequestInit = {}) {
    const res = await fetch(url, { ...opts, headers: { ...headers(), ...((opts.headers as Record<string, string>) ?? {}) } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: json };
    return { data: json, error: null };
  }

  return { auth, db, functions };
}
