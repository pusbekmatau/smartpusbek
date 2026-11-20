import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { cacheTtlSeconds, connectorMode } from "@/lib/data-connector";
import type { SystemStatus } from "@/lib/types";

export async function GET() {
  const guard = await requirePermission("data:read");
  if (!guard.ok) return guard.response;
  const body: SystemStatus = { mode: connectorMode(), serverTime: new Date().toISOString(), cacheTtlSeconds: cacheTtlSeconds() };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
