import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit-store";
import { ROLE_LABEL, ROLES } from "@/lib/rbac";
import { createUser, deleteUser, listUsers, updateUser, UserStoreError } from "@/lib/user-store";
import type { Role } from "@/lib/types";

const roleSchema = z.enum(ROLES as [Role, ...Role[]]);
const passwordSchema = z
  .string()
  .min(10, "Kata sandi minimal 10 karakter.")
  .max(200)
  .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
  .regex(/\d/, "Kata sandi harus memuat angka.");

const createSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/, "Nama pengguna hanya boleh huruf, angka, titik, garis bawah, atau strip."),
  name: z.string().trim().min(2).max(80),
  role: roleSchema,
  password: passwordSchema,
});
const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
});

const NO_STORE = { "Cache-Control": "no-store" };

function failure(err: unknown) {
  if (err instanceof UserStoreError) return apiError(err.code === "NOT_FOUND" ? 404 : 409, err.code, err.message);
  console.error("[api/users]", err);
  return apiError(500, "INTERNAL_ERROR", "Terjadi gangguan saat memproses akun.");
}

function invalid(error: z.ZodError) {
  return apiError(400, "INVALID_INPUT", error.issues[0]?.message ?? "Data akun tidak valid.");
}

export async function GET() {
  const guard = await requirePermission("users:manage");
  if (!guard.ok) return guard.response;
  return NextResponse.json({ users: await listUsers() }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("users:manage");
  if (!guard.ok) return guard.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const user = await createUser(parsed.data);
    await recordAudit({ actor: guard.user, action: "USER_CREATE", summary: `Membuat akun ${user.username} (${ROLE_LABEL[user.role]})` });
    return NextResponse.json({ user }, { status: 201, headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requirePermission("users:manage");
  if (!guard.ok) return guard.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...patch } = parsed.data;
  try {
    const { before, after } = await updateUser(guard.user.id, id, patch);
    const notes: string[] = [];
    if (patch.role && before.role !== after.role) notes.push(`peran ${ROLE_LABEL[before.role]} → ${ROLE_LABEL[after.role]}`);
    if (patch.active !== undefined && before.active !== after.active) notes.push(after.active ? "diaktifkan" : "dinonaktifkan");
    if (patch.password) notes.push("kata sandi diatur ulang");
    if (patch.name && before.name !== after.name) notes.push("nama diperbarui");
    await recordAudit({
      actor: guard.user,
      action: "USER_UPDATE",
      summary: `Akun ${after.username}: ${notes.join(", ") || "tanpa perubahan"}`,
    });
    return NextResponse.json({ user: after }, { headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requirePermission("users:manage");
  if (!guard.ok) return guard.response;
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return apiError(400, "INVALID_INPUT", "ID akun tidak valid.");
  try {
    const removed = await deleteUser(guard.user.id, id);
    await recordAudit({ actor: guard.user, action: "USER_DELETE", summary: `Menghapus akun ${removed.username}` });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    return failure(err);
  }
}
