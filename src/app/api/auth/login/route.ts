import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/auth";
import { recordAudit } from "@/lib/audit-store";
import { clearLoginFailures, loginBlockedFor, registerLoginFailure } from "@/lib/rate-limit";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session-token";
import { toSessionUser, verifyCredentials } from "@/lib/user-store";

const schema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", "Nama pengguna dan kata sandi wajib diisi.");

  const { identifier, password } = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${ip}:${identifier.toLowerCase()}`;

  const wait = loginBlockedFor(key);
  if (wait > 0) {
    return apiError(429, "TOO_MANY_ATTEMPTS", `Terlalu banyak percobaan. Coba kembali dalam ${Math.ceil(wait / 60)} menit.`);
  }

  const user = await verifyCredentials(identifier, password);
  if (!user) {
    registerLoginFailure(key);
    await recordAudit({ actor: { username: identifier.slice(0, 60) }, action: "LOGIN_FAILED", summary: "Percobaan masuk gagal" });
    return apiError(401, "INVALID_CREDENTIALS", "Kredensial tidak valid atau akun dinonaktifkan.");
  }

  clearLoginFailures(key);
  const session = toSessionUser(user);
  const token = await signSession(session);
  await recordAudit({ actor: session, action: "LOGIN", summary: "Masuk ke Command Center" });

  const response = NextResponse.json({ user: session }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
