"use client";

import { KeyRound, Plus, Power, Server, Trash2, UserCog } from "lucide-react";
import { useState } from "react";
import { useSession, useSync } from "@/components/layout/AppProviders";
import { Reveal } from "@/components/dashboard/MotionWrappers";
import { PageHeading } from "@/components/dashboard/Panel";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatDateTimeWIB } from "@/lib/format";
import { ROLE_LABEL, ROLES } from "@/lib/rbac";
import type { PublicUser, Role } from "@/lib/types";
import { useRemote } from "@/lib/use-remote";
import { RoleBadge } from "./RoleBadge";

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; user: PublicUser }
  | { kind: "password"; user: PublicUser }
  | { kind: "delete"; user: PublicUser }
  | null;

const input =
  "focus-ring h-10 w-full rounded-lg border border-line bg-abyss/70 px-3 text-sm text-ink placeholder:text-haze transition focus:border-gold/50";

export function UserManagementPanel() {
  const { user: me } = useSession();
  const { status } = useSync();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useRemote<{ users: PublicUser[] }>("/api/users");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", role: "VIEWER" as Role, password: "" });

  const open = (next: Dialog) => {
    if (next?.kind === "create") setForm({ username: "", name: "", role: "VIEWER", password: "" });
    if (next?.kind === "edit") setForm({ username: next.user.username, name: next.user.name, role: next.user.role, password: "" });
    if (next?.kind === "password") setForm((f) => ({ ...f, password: "" }));
    setDialog(next);
  };

  const replaceUser = (u: PublicUser) => setData((d) => (d ? { users: d.users.map((x) => (x.id === u.id ? u : x)) } : d));

  const run = async (task: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await task();
      toast("success", success);
      setDialog(null);
    } catch (err) {
      toast("error", "Tindakan ditolak", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    if (dialog.kind === "create") {
      void run(async () => {
        const res = await apiFetch<{ user: PublicUser }>("/api/users", { method: "POST", json: form });
        setData((d) => (d ? { users: [...d.users, res.user] } : d));
      }, "Akun baru berhasil dibuat");
    } else if (dialog.kind === "edit") {
      void run(async () => {
        const res = await apiFetch<{ user: PublicUser }>("/api/users", { method: "PATCH", json: { id: dialog.user.id, name: form.name, role: form.role } });
        replaceUser(res.user);
      }, "Akun diperbarui");
    } else if (dialog.kind === "password") {
      void run(async () => {
        const res = await apiFetch<{ user: PublicUser }>("/api/users", { method: "PATCH", json: { id: dialog.user.id, password: form.password } });
        replaceUser(res.user);
      }, "Kata sandi berhasil diatur ulang");
    }
  };

  const toggleActive = (u: PublicUser) =>
    void run(async () => {
      const res = await apiFetch<{ user: PublicUser }>("/api/users", { method: "PATCH", json: { id: u.id, active: !u.active } });
      replaceUser(res.user);
    }, u.active ? "Akun dinonaktifkan" : "Akun diaktifkan");

  const remove = (u: PublicUser) =>
    void run(async () => {
      await apiFetch(`/api/users?id=${encodeURIComponent(u.id)}`, { method: "DELETE" });
      setData((d) => (d ? { users: d.users.filter((x) => x.id !== u.id) } : d));
    }, "Akun dihapus");

  return (
    <>
      <Reveal>
        <PageHeading
          eyebrow="Administrasi Sistem"
          title="Manajemen Pengguna"
          description="Kelola akun personel, peran akses, dan status aktivasi. Setiap perubahan tercatat dalam Log Audit."
          actions={
            <Button variant="primary" onClick={() => open({ kind: "create" })} icon={<Plus className="size-4" aria-hidden />}>
              Tambah Pengguna
            </Button>
          }
        />
      </Reveal>

      {status?.mode === "local" && (
        <Reveal delay={0.05}>
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/[0.05] px-4 py-3 text-xs text-mist">
            <Server className="mt-px size-4 shrink-0 text-gold-soft" aria-hidden />
            <p>
              <span className="text-gold-soft">Mode sinkronisasi lokal aktif.</span> Pembacaan modul berjalan normal, sementara penulisan disimpan pada lapisan
              persistensi lokal server hingga kredensial akun layanan utama dipasang pada konfigurasi lingkungan.
            </p>
          </div>
        </Reveal>
      )}

      {error && !data ? (
        <StatusCard message={error.message} onRetry={() => reload()} retrying={loading} />
      ) : (
        <Reveal delay={0.1}>
          <div className="glass thin-scroll overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line text-xs text-haze">
                <tr>
                  <th className="px-5 py-3 font-medium">Personel</th>
                  <th className="px-5 py-3 font-medium">Peran</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Masuk Terakhir</th>
                  <th className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!data
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-5 py-3">
                          <div className="skeleton h-8" />
                        </td>
                      </tr>
                    ))
                  : data.users.map((u) => (
                      <tr key={u.id} className={cn("border-b border-line/50 last:border-0", !u.active && "opacity-60")}>
                        <td className="px-5 py-3.5">
                          <p className="text-ink">
                            {u.name} {u.id === me.id && <span className="text-xs text-haze">(Anda)</span>}
                          </p>
                          <p className="tabular text-xs text-haze">@{u.username}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className={cn("inline-flex items-center gap-1.5", u.active ? "text-ice" : "text-haze")}>
                            <span className={cn("size-1.5 rounded-full", u.active ? "bg-steel" : "bg-haze")} />
                            {u.active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="tabular px-5 py-3.5 text-xs text-mist">{u.lastLoginAt ? formatDateTimeWIB(u.lastLoginAt) : "—"}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <IconAction label="Ubah profil & peran" onClick={() => open({ kind: "edit", user: u })} icon={UserCog} />
                            <IconAction label="Atur ulang kata sandi" onClick={() => open({ kind: "password", user: u })} icon={KeyRound} />
                            {u.id !== me.id && (
                              <>
                                <IconAction label={u.active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleActive(u)} icon={Power} disabled={busy} />
                                <IconAction label="Hapus akun" onClick={() => open({ kind: "delete", user: u })} icon={Trash2} danger />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}

      <Modal
        open={dialog?.kind === "create" || dialog?.kind === "edit" || dialog?.kind === "password"}
        onClose={() => setDialog(null)}
        eyebrow="Manajemen Pengguna"
        title={dialog?.kind === "create" ? "Tambah Akun Personel" : dialog?.kind === "edit" ? "Ubah Profil & Peran" : "Atur Ulang Kata Sandi"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="user-form" loading={busy}>
              Simpan
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="space-y-4">
          {dialog?.kind === "create" && (
            <Field label="Nama Pengguna">
              <input className={input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
            </Field>
          )}
          {(dialog?.kind === "create" || dialog?.kind === "edit") && (
            <>
              <Field label="Nama Lengkap & Pangkat">
                <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Peran Akses">
                <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {(dialog?.kind === "create" || dialog?.kind === "password") && (
            <Field label={dialog.kind === "password" ? `Kata Sandi Baru untuk @${dialog.user.username}` : "Kata Sandi Awal"}>
              <input
                type="password"
                autoComplete="new-password"
                className={input}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={10}
              />
              <span className="mt-1.5 block text-[0.7rem] text-haze">Minimal 10 karakter, memuat huruf dan angka.</span>
            </Field>
          )}
        </form>
      </Modal>

      <Modal
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        eyebrow="Konfirmasi Keamanan"
        title="Hapus akun personel?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button variant="danger" loading={busy} onClick={() => dialog?.kind === "delete" && remove(dialog.user)} icon={<Trash2 className="size-4" aria-hidden />}>
              Hapus Akun
            </Button>
          </>
        }
      >
        {dialog?.kind === "delete" && (
          <p className="text-sm text-mist">
            Akun <span className="text-ink">@{dialog.user.username}</span> ({dialog.user.name}) akan dihapus permanen dan tidak dapat lagi mengakses Command Center.
            Pertimbangkan penonaktifan bila akses hanya perlu dibekukan sementara.
          </p>
        )}
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-mist">{label}</span>
      {children}
    </label>
  );
}

function IconAction({ label, onClick, icon: Icon, danger, disabled }: { label: string; onClick: () => void; icon: typeof Power; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring rounded-md p-2 text-mist transition disabled:opacity-40",
        danger ? "hover:bg-crimson/15 hover:text-[#fca5a5]" : "hover:bg-cobalt/15 hover:text-ink",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
