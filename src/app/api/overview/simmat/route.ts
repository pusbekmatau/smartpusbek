import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { buildSimmatTrend } from "@/lib/overview";

export async function GET(request: NextRequest) {
  const guard = await requirePermission("data:read");
  if (!guard.ok) return guard.response;
  const force = request.nextUrl.searchParams.get("refresh") === "1" && can(guard.user.role, "data:force-sync");
  return NextResponse.json(await buildSimmatTrend(force), { headers: { "Cache-Control": "no-store" } });
}
