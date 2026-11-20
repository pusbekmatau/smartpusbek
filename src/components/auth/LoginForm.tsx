"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EyebrowBadge } from "@/components/ui/EyebrowBadge";
import { Logo } from "@/components/ui/Logo";
import { PillarBar } from "@/components/ui/PillarBar";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

export function LoginForm({ next, devPanel }: { next: string; devPanel?: React.ReactNode }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [touched, setTouched] = useState({ identifier: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idError = touched.identifier && !identifier.trim() ? "Nama pengguna wajib diisi." : null;
  const pwError = touched.password && !password ? "Kata sandi wajib diisi." : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    if (!identifier.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/login", { method: "POST", json: { identifier, password } });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak dapat memproses permintaan masuk.");
      setSubmitting(false);
    }
  };

  const field = (invalid: boolean) =>
    cn(
      "focus-ring h-12 w-full rounded-xl border bg-abyss/70 pr-4 pl-11 text-sm text-ink placeholder:text-haze transition",
      invalid ? "border-crimson/60" : "border-line focus:border-gold/50",
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: EASE }}
      className="w-full max-w-[440px]"
    >
      <div className="glass overflow-hidden rounded-2xl shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex h-[2px]">
          <span className="flex-1 bg-steel" />
          <span className="flex-1 bg-gold" />
          <span className="flex-1 bg-crimson" />
        </div>

        <div className="px-8 pt-9 pb-8 sm:px-10">
          <div className="flex flex-col items-center text-center">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, duration: 0.8, ease: EASE }}>
              <Logo size={84} priority />
            </motion.div>
            <EyebrowBadge className="mt-6" />
            <h1 className="mt-5 font-display text-[1.7rem] leading-tight font-semibold text-ink">SMART PUSBEKMATAU</h1>
            <p className="mt-1.5 text-sm text-mist">Autentikasi personel untuk akses Command Center</p>
            <PillarBar size="sm" className="mt-5 justify-center" delay={0.35} />
          </div>

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-2 block text-xs font-medium text-mist">
                Nama Pengguna / Email
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-haze" aria-hidden />
                <input
                  id="identifier"
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
                  aria-invalid={Boolean(idError)}
                  className={field(Boolean(idError))}
                  placeholder="nama.pengguna"
                />
              </div>
              {idError && <p className="mt-1.5 text-xs text-[#fca5a5]">{idError}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-medium text-mist">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-haze" aria-hidden />
                <input
                  id="password"
                  type={reveal ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  aria-invalid={Boolean(pwError)}
                  className={cn(field(Boolean(pwError)), "pr-12")}
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="focus-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1.5 text-haze transition hover:text-ink"
                  aria-label={reveal ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {pwError && <p className="mt-1.5 text-xs text-[#fca5a5]">{pwError}</p>}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2.5 rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-xs text-[#fecaca]"
                >
                  <AlertCircle className="mt-px size-4 shrink-0 text-crimson-soft" aria-hidden />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={submitting}
              className="focus-ring group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-gold-soft to-gold text-sm font-semibold text-abyss shadow-[0_14px_40px_-16px_rgba(212,175,55,0.75)] transition hover:brightness-105 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Memverifikasi kredensial…
                </>
              ) : (
                <>
                  Masuk ke Command Center
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </>
              )}
            </button>
          </form>

          {devPanel}
        </div>

        <div className="border-t border-line px-8 py-4 text-center text-[0.68rem] text-haze sm:px-10">
          Sesi terenkripsi · Akses dipantau dan tercatat dalam log audit
        </div>
      </div>
    </motion.div>
  );
}
