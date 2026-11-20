import { NextResponse } from "next/server";
import { apiError, getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  if (!user) return apiError(401, "UNAUTHENTICATED", "Sesi tidak ditemukan.");
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
