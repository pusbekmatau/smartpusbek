"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogOut, Menu, RefreshCw, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatClockWIB, formatDayWIB } from "@/lib/format";
import { MODULES } from "@/lib/modules";
import { breadcrumbFor } from "@/lib/navigation";
import { useSession, useSync } from "./AppProviders";

function WibClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden text-right 2xl:block" aria-live="off">
      <p className="tabular text-sm text-ink">{now ? `${formatClockWIB(now)} WIB` : "--:--:-- WIB"}</p>
      <p className="text-[0.65rem] text-haze">{now ? formatDayWIB(now) : " "}</p>
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const term = query.trim().toLowerCase();
  const results = useMemo(
    () => (term ? MODULES.filter((m) => `${m.title} ${m.description}`.toLowerCase().includes(term)) : MODULES).slice(0, 7),
    [term],
  );

  const go = (slug: string, withQuery: boolean) => {
    router.push(`/dashboard/${slug}${withQuery && query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-haze" aria-hidden />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setCursor((c) => Math.min(c + 1, results.length - 1));
          if (e.key === "ArrowUp") setCursor((c) => Math.max(c - 1, 0));
          if (e.key === "Enter" && results[cursor]) go(results[cursor].slug, !results[cursor].title.toLowerCase().includes(term));
          if (e.key === "Escape") inputRef.current?.blur();
        }}
        placeholder="Cari modul atau entitas data…"
        aria-label="Pencarian global"
        className="focus-ring h-10 w-full rounded-lg border border-line bg-abyss/60 pr-14 pl-9 text-sm text-ink placeholder:text-haze transition focus:border-gold/40"
      />
      <kbd className="tabular pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[0.6rem] text-haze sm:block">
        Ctrl K
      </kbd>
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="glass absolute top-12 right-0 left-0 z-40 overflow-hidden rounded-xl shadow-2xl shadow-black/50"
          >
            {results.length === 0 ? (
              <p className="px-4 py-3 text-xs text-mist">Tidak ada modul yang cocok.</p>
            ) : (
              <ul className="py-1.5">
                {results.map((m, i) => (
                  <li key={m.slug}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(m.slug, !m.title.toLowerCase().includes(term))}
                      onMouseEnter={() => setCursor(i)}
                      className={cn("flex w-full flex-col px-4 py-2 text-left transition", i === cursor && "bg-cobalt/15")}
                    >
                      <span className="text-sm text-ink">{m.title}</span>
                      <span className="truncate text-[0.7rem] text-haze">{m.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {term && (
              <p className="border-t border-line px-4 py-2 text-[0.68rem] text-haze">
                Tekan Enter untuk membuka modul; kata kunci diteruskan ke pencarian tabel.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { user, can } = useSession();
  const { requestSync, syncing, status, online } = useSync();
  const [leaving, setLeaving] = useState(false);
  const crumbs = breadcrumbFor(pathname);

  const logout = async () => {
    setLeaving(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const sync = () => {
    requestSync();
    toast("info", can("data:force-sync") ? "Sinkronisasi paksa server dimulai" : "Memuat ulang data dari server");
  };

  const connection = !online
    ? { tone: "warn" as const, label: "Server tidak terjangkau" }
    : status?.mode === "local"
      ? { tone: "warn" as const, label: "Sinkronisasi lokal" }
      : { tone: "live" as const, label: "Server terhubung" };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-abyss/80 backdrop-blur-xl">
      <div className="hairline-tricolor" />
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button onClick={onOpenMenu} className="focus-ring rounded-lg p-2 text-mist hover:text-ink lg:hidden" aria-label="Buka navigasi">
          <Menu className="size-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-xs whitespace-nowrap text-haze xl:flex">
          {crumbs.slice(1).map((c, i, list) => (
            <span key={`${c}-${i}`} className={cn("flex min-w-0 items-center gap-1.5", i === list.length - 1 ? "shrink" : "shrink-[3]")}>
              {i > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden />}
              <span className={cn("truncate", i === list.length - 1 && "text-ink")} title={c}>
                {c}
              </span>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-3 md:flex-none md:shrink-0">
          <div className="hidden md:block md:w-56 xl:w-64 2xl:w-80">
            <GlobalSearch />
          </div>

          <div
            className="hidden items-center gap-2 rounded-lg border border-line px-3 py-2 text-[0.7rem] text-mist sm:flex"
            title={status?.mode === "local" ? "Penulisan disimpan pada lapisan persistensi lokal server hingga kredensial utama dipasang." : undefined}
          >
            <StatusDot tone={connection.tone} />
            {connection.label}
          </div>

          <button
            onClick={sync}
            disabled={syncing}
            className="focus-ring inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-cobalt/10 px-3 text-xs text-ink transition hover:border-steel/50 disabled:opacity-60"
            title="Sinkronisasi Data Server"
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} aria-hidden />
            <span className="hidden sm:inline">{syncing ? "Menyinkronkan…" : "Sinkronisasi"}</span>
          </button>

          <WibClock />

          <div className="flex items-center gap-3 border-l border-line pl-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm leading-tight text-ink">{user.name}</p>
              <RoleBadge role={user.role} className="mt-1" />
            </div>
            <button
              onClick={logout}
              disabled={leaving}
              className="focus-ring rounded-lg border border-transparent p-2 text-mist transition hover:border-crimson/40 hover:bg-crimson/10 hover:text-[#fca5a5]"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 py-2 md:hidden">
        <GlobalSearch />
      </div>
    </header>
  );
}
