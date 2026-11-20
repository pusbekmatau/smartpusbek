import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit-store";
import { createRecord, DataSourceError, deleteRecord, loadDataset, updateRecord } from "@/lib/data-connector";
import { getModule } from "@/lib/modules";
import { can } from "@/lib/rbac";
import type { DatasetResponse } from "@/lib/types";

type Context = { params: Promise<{ slug: string }> };

const valuesSchema = z.record(z.string().max(200), z.union([z.string(), z.number(), z.null()]));
const createSchema = z.object({ values: valuesSchema });
const updateSchema = z.object({ rowId: z.string().min(1).max(80), values: valuesSchema.refine((v) => Object.keys(v).length > 0) });
const deleteSchema = z.object({ rowId: z.string().min(1).max(80) });

const NO_STORE = { "Cache-Control": "no-store" };

function failure(err: unknown) {
  if (err instanceof DataSourceError) return apiError(err.status, err.code, err.message);
  console.error("[api/database]", err);
  return apiError(500, "INTERNAL_ERROR", "Terjadi gangguan pada server basis data. Silakan coba kembali.");
}

async function resolveModule(context: Context) {
  const { slug } = await context.params;
  return getModule(slug) ?? null;
}

export async function GET(request: NextRequest, context: Context) {
  const guard = await requirePermission("data:read");
  if (!guard.ok) return guard.response;
  const mod = await resolveModule(context);
  if (!mod) return apiError(404, "MODULE_NOT_FOUND", "Modul data tidak ditemukan.");

  const force = request.nextUrl.searchParams.get("refresh") === "1" && can(guard.user.role, "data:force-sync");
  try {
    const ds = await loadDataset(mod.slug, { force });
    if (force) await recordAudit({ actor: guard.user, action: "FORCE_SYNC", module: mod.slug, summary: `Sinkronisasi paksa modul ${mod.title}` });
    const body: DatasetResponse = {
      slug: mod.slug,
      title: mod.title,
      columns: ds.columns,
      rows: ds.rows,
      meta: { mode: ds.mode, syncedAt: ds.syncedAt, cached: ds.cached, rowCount: ds.rows.length },
    };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const guard = await requirePermission("data:create");
  if (!guard.ok) return guard.response;
  const mod = await resolveModule(context);
  if (!mod) return apiError(404, "MODULE_NOT_FOUND", "Modul data tidak ditemukan.");
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", "Struktur data entri tidak valid.");

  try {
    const row = await createRecord(mod.slug, parsed.data.values);
    await recordAudit({
      actor: guard.user,
      action: "RECORD_CREATE",
      module: mod.slug,
      summary: `Menambahkan entri baru pada ${mod.title}`,
      changes: Object.fromEntries(Object.entries(row.values).filter(([, v]) => v).map(([k, v]) => [k, { before: null, after: v }])),
    });
    return NextResponse.json({ row, syncedAt: new Date().toISOString() }, { status: 201, headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const guard = await requirePermission("data:update");
  if (!guard.ok) return guard.response;
  const mod = await resolveModule(context);
  if (!mod) return apiError(404, "MODULE_NOT_FOUND", "Modul data tidak ditemukan.");
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", "Permintaan pembaruan tidak valid.");

  try {
    const { before, after } = await updateRecord(mod.slug, parsed.data.rowId, parsed.data.values);
    const changes = Object.fromEntries(
      Object.keys(parsed.data.values)
        .filter((k) => before.values[k] !== after.values[k])
        .map((k) => [k, { before: before.values[k] ?? null, after: after.values[k] ?? null }]),
    );
    await recordAudit({
      actor: guard.user,
      action: "RECORD_UPDATE",
      module: mod.slug,
      summary: `Memperbarui ${Object.keys(changes).length} sel pada ${mod.title} (baris ${parsed.data.rowId})`,
      changes,
    });
    return NextResponse.json({ row: after, syncedAt: new Date().toISOString() }, { headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const guard = await requirePermission("data:delete");
  if (!guard.ok) return guard.response;
  const mod = await resolveModule(context);
  if (!mod) return apiError(404, "MODULE_NOT_FOUND", "Modul data tidak ditemukan.");
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", "Permintaan penghapusan tidak valid.");

  try {
    const removed = await deleteRecord(mod.slug, parsed.data.rowId);
    await recordAudit({
      actor: guard.user,
      action: "RECORD_DELETE",
      module: mod.slug,
      summary: `Menghapus baris ${parsed.data.rowId} dari ${mod.title}`,
      changes: Object.fromEntries(Object.entries(removed.values).filter(([, v]) => v).map(([k, v]) => [k, { before: v, after: null }])),
    });
    return NextResponse.json({ ok: true, rowId: parsed.data.rowId }, { headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}
