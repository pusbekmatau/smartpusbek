import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit-store";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-token";

export async function POST() {
  const user = await getSession();
  if (user) await recordAudit({ actor: user, action: "LOGOUT", summary: "Keluar dari Command Center" });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
