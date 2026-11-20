import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { can, type Permission } from "./rbac";
import { SESSION_COOKIE, verifySession } from "./session-token";
import { findUserById, toSessionUser } from "./user-store";
import type { ApiErrorBody, SessionUser } from "./types";

/**
 * Resolves the current session and re-validates it against the user store,
 * so deactivated accounts or role changes take effect immediately.
 */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await findUserById(claims.id);
  if (!user || !user.active) return null;
  return toSessionUser(user);
}

export function apiError(status: number, code: string, message: string): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

type Guarded = { ok: true; user: SessionUser } | { ok: false; response: NextResponse<ApiErrorBody> };

/** Authenticates the request and enforces a permission. Use at the top of every protected route. */
export async function requirePermission(permission: Permission): Promise<Guarded> {
  const user = await getSession();
  if (!user) {
    return { ok: false, response: apiError(401, "UNAUTHENTICATED", "Sesi Anda telah berakhir. Silakan masuk kembali.") };
  }
  if (!can(user.role, permission)) {
    return {
      ok: false,
      response: apiError(403, "FORBIDDEN", "Peran Anda tidak memiliki wewenang untuk tindakan ini."),
    };
  }
  return { ok: true, user };
}
