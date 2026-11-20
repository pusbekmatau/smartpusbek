import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { queryAudit } from "@/lib/audit-store";

export async function GET(request: NextRequest) {
  const guard = await requirePermission("audit:read");
  if (!guard.ok) return guard.response;
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
  const offset = Math.max(0, Number(sp.get("offset")) || 0);
  const result = await queryAudit({
    action: sp.get("action") || undefined,
    module: sp.get("module") || undefined,
    q: sp.get("q") || undefined,
    limit,
    offset,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
