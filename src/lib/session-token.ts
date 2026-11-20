/**
 * Edge-compatible session token helpers (used by middleware and route handlers).
 */
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { isRole } from "./rbac";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "pbk_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours, one duty shift

const ISSUER = "smart-pusbekmatau";
const AUDIENCE = "command-center";
const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-me-0123456789abcdef";

let cachedKey: Uint8Array | null = null;

function secretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set (min. 32 characters) in production.");
    }
    cachedKey = new TextEncoder().encode(DEV_FALLBACK_SECRET);
    return cachedKey;
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ username: user.username, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER, audience: AUDIENCE });
    const { sub, username, name, role } = payload;
    if (typeof sub !== "string" || typeof username !== "string" || typeof name !== "string" || !isRole(role)) {
      return null;
    }
    return { id: sub, username, name, role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
