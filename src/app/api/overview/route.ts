import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit-store";
import { can } from "@/lib/rbac";
import { buildOverview } from "@/lib/overview";

export async function GET(request: NextRequest) {
  const guard = await requirePermission("data:read");
  if (!guard.ok) return guard.response;
  const force = request.nextUrl.searchParams.get("refresh") === "1" && can(guard.user.role, "data:force-sync");
  if (force) await recordAudit({ actor: guard.user, action: "FORCE_SYNC", summary: "Sinkronisasi paksa seluruh modul data" });
  return NextResponse.json(await buildOverview(force), { headers: { "Cache-Control": "no-store" } });
}
