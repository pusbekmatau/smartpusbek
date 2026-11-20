"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Reveal } from "@/components/dashboard/MotionWrappers";
import { PageHeading } from "@/components/dashboard/Panel";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { cn } from "@/lib/cn";
import { formatDateTimeWIB, formatNumber } from "@/lib/format";
import { getModule, MODULES } from "@/lib/modules";
import type { AuditAction, AuditEntry } from "@/lib/types";
import { useRemote } from "@/lib/use-remote";
import { RoleBadge } from "./RoleBadge";

const ACTION_META: Record<AuditAction, { label: string; tone: "gold" | "steel" | "crimson" | "mist" }> = {
  LOGIN: { label: "Masuk", tone: "mist" },
  LOGOUT: { label: "Keluar", tone: "mist" },
  LOGIN_FAILED: { label: "Gagal Masuk", tone: "crimson" },
  RECORD_CREATE: { label: "Tambah Data", tone: "gold" },
  RECORD_UPDATE: { label: "Ubah Data", tone: "steel" },
  RECORD_DELETE: { label: "Hapus Data", tone: "crimson" },
  FORCE_SYNC: { label: "Sinkronisasi", tone: "steel" },
  USER_CREATE: { label: "Buat Akun", tone: "gold" },
  USER_UPDATE: { label: "Ubah Akun", tone: "steel" },
  USER_DELETE: { label: "Hapus Akun", tone: "crimson" },
};

const TONE = {
  gold: "border-gold/40 text-gold-soft",
  steel: "border-steel/40 text-ice",
  crimson: "border-crimson/45 text-[#fca5a5]",
  mist: "border-mist/25 text-mist",
};

const PAGE = 25;
const control = "focus-ring h-9 rounded-lg border border-line bg-abyss/60 px-3 text-xs text-ink";

export function AuditLogTable() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [action, setAction] = useState("");
  const [moduleSlug, setModuleSlug] = useState("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(id);
  }, [q]);
  useEffect(() => setOffset(0), [debounced, action, moduleSlug]);

  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (debounced) params.set("q", debounced);
  if (action) params.set("action", action);
  if (moduleSlug) params.set("module", moduleSlug);
  const { data, error, loading, reload } = useRemote<{ total: number; entries: AuditEntry[] }>(`/api/audit-logs?${params}`);

  return (
    <>
      <Reveal>
        <PageHeading
          eyebrow="Administrasi Sistem"
          title="Log Audit Aktivitas"
          description="Rekam jejak siapa mengubah, menambah, atau menghapus data — beserta waktu kejadian dalam WIB."
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-60 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-haze" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pengguna atau keterangan…" className={cn(control, "w-full pl-9")} />
          </div>
          <select value={action} onChange={(e) => setAction(e.target.value)} className={control} aria-label="Filter aksi">
            <option value="">Semua aksi</option>
            {Object.entries(ACTION_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select value={moduleSlug} onChange={(e) => setModuleSlug(e.target.value)} className={control} aria-label="Filter modul">
            <option value="">Semua modul</option>
            {MODULES.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </Reveal>

      {error && !data ? (
        <StatusCard message={error.message} onRetry={() => reload()} retrying={loading} />
      ) : (
        <Reveal delay={0.1}>
          <div className="glass overflow-hidden rounded-2xl">
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-line text-xs text-haze">
                  <tr>
                    <th className="px-5 py-3 font-medium">Waktu (WIB)</th>
                    <th className="px-5 py-3 font-medium">Pengguna</th>
                    <th className="px-5 py-3 font-medium">Aksi</th>
                    <th className="px-5 py-3 font-medium">Modul</th>
                    <th className="px-5 py-3 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody className={cn(loading && data && "opacity-60 transition-opacity")}>
                  {!data ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-5 py-2.5">
                          <div className="skeleton h-7" />
                        </td>
                      </tr>
                    ))
                  ) : data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-14 text-center text-sm text-mist">
                        Belum ada aktivitas yang sesuai kriteria.
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((e) => {
                      const meta = ACTION_META[e.action];
                      const hasChanges = e.changes && Object.keys(e.changes).length > 0;
                      const isOpen = expanded === e.id;
                      return (
                        <Fragment key={e.id}>
                          <tr
                            className={cn("border-b border-line/50", hasChanges && "cursor-pointer hover:bg-cobalt/[0.06]")}
                            onClick={() => hasChanges && setExpanded(isOpen ? null : e.id)}
                          >
                            <td className="tabular px-5 py-3 text-xs whitespace-nowrap text-mist">{formatDateTimeWIB(e.at)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-ink">{e.actor.username}</span>
                                {e.actor.role && <RoleBadge role={e.actor.role} />}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn("rounded-md border px-2 py-0.5 text-[0.7rem]", TONE[meta.tone])}>{meta.label}</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-mist">{e.module ? (getModule(e.module)?.title ?? e.module) : "—"}</td>
                            <td className="px-5 py-3 text-xs text-ink/90">
                              <span className="flex items-center justify-between gap-3">
                                {e.summary}
                                {hasChanges && <ChevronDown className={cn("size-3.5 shrink-0 text-haze transition", isOpen && "rotate-180")} aria-hidden />}
                              </span>
                            </td>
                          </tr>
                          <AnimatePresence initial={false}>
                            {isOpen && e.changes && (
                              <tr>
                                <td colSpan={5} className="bg-abyss/40 p-0">
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <dl className="grid gap-x-6 gap-y-1.5 px-5 py-4 text-xs sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]">
                                      <dt className="text-haze">Atribut</dt>
                                      <dt className="text-haze">Sebelum</dt>
                                      <dt className="text-haze">Sesudah</dt>
                                      {Object.entries(e.changes).map(([k, v]) => (
                                        <Fragment key={k}>
                                          <dd className="truncate text-mist">{k}</dd>
                                          <dd className="truncate text-[#fca5a5]/80 line-through decoration-crimson/40">{v.before ?? "—"}</dd>
                                          <dd className="truncate text-gold-soft">{v.after ?? "—"}</dd>
                                        </Fragment>
                                      ))}
                                    </dl>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {data && (
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-mist">
                <span className="tabular">
                  {formatNumber(data.total === 0 ? 0 : offset + 1)}–{formatNumber(Math.min(offset + PAGE, data.total))} dari {formatNumber(data.total)} catatan
                </span>
                <div className="flex gap-1">
                  <button
                    aria-label="Sebelumnya"
                    disabled={offset === 0}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
                    className="focus-ring rounded-md p-1.5 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    aria-label="Berikutnya"
                    disabled={offset + PAGE >= data.total}
                    onClick={() => setOffset((o) => o + PAGE)}
                    className="focus-ring rounded-md p-1.5 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}
    </>
  );
}
