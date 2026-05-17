// Self-contained crypto helpers: scrypt password hashing, HS256 JWTs,
// random token/code generation, base64url codecs, PKCE verification.

import { randomBytes, scryptSync, timingSafeEqual, createHmac, createHash } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${derived.toString(
    "base64"
  )}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  const derived = scryptSync(password.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export interface JwtClaims {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  iss?: string;
  iat: number;
  exp: number;
  session_id?: string;
  [key: string]: unknown;
}

export function signJwt(
  claims: Omit<JwtClaims, "iat" | "exp"> & Partial<Pick<JwtClaims, "iat" | "exp">>,
  secret: string,
  ttlSec: number
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full: JwtClaims = {
    iat: now,
    exp: now + ttlSec,
    ...claims,
  } as JwtClaims;
  const encHeader = b64url(JSON.stringify(header));
  const encPayload = b64url(JSON.stringify(full));
  const sig = createHmac("sha256", secret).update(`${encHeader}.${encPayload}`).digest();
  return `${encHeader}.${encPayload}.${b64url(sig)}`;
}

export function verifyJwt<T extends JwtClaims = JwtClaims>(token: string, secret: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed_token");
  const [h, p, s] = parts;
  const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
  const provided = b64urlDecode(s);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error("bad_signature");
  }
  const payload = JSON.parse(b64urlDecode(p).toString("utf8")) as T;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) throw new Error("token_expired");
  return payload;
}

export function randomToken(bytes = 32): string {
  return b64url(randomBytes(bytes));
}

export function randomId(): string {
  // 22-char base64url uuid-ish id (128 bits of entropy).
  return b64url(randomBytes(16));
}

export function verifyPkce(
  verifier: string,
  challenge: string,
  method: "S256" | "plain" = "S256"
): boolean {
  if (method === "plain") return verifier === challenge;
  const hashed = b64url(createHash("sha256").update(verifier).digest());
  return hashed === challenge;
}

export function hashSecret(secret: string): string {
  // For client secrets / service keys at rest. Stored alongside salt.
  return hashPassword(secret);
}

export function verifySecret(secret: string, stored: string): boolean {
  return verifyPassword(secret, stored);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
