import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

/**
 * Edge gate: verifies the signed session for every protected page and API.
 * Route handlers re-check the session against the user store and enforce RBAC.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  const isApi = pathname.startsWith("/api/");

  if (!user) {
    if (isApi) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sesi Anda telah berakhir. Silakan masuk kembali." } },
        { status: 401 },
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const adminOnly = pathname.startsWith("/admin") || pathname.startsWith("/api/users") || pathname.startsWith("/api/audit-logs");
  if (adminOnly && user.role !== "ADMIN") {
    if (isApi) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Peran Anda tidak memiliki wewenang untuk tindakan ini." } },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/database/:path*",
    "/api/overview/:path*",
    "/api/users/:path*",
    "/api/audit-logs/:path*",
    "/api/system/:path*",
  ],
};
