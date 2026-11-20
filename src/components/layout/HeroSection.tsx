"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Magnetic } from "@/components/dashboard/MotionWrappers";
import { EyebrowBadge } from "@/components/ui/EyebrowBadge";
import { Logo } from "@/components/ui/Logo";
import { PillarBar } from "@/components/ui/PillarBar";
import { StatusDot } from "@/components/ui/StatusDot";
import { MODULE_GROUPS, MODULES } from "@/lib/modules";

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 22, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.9, delay, ease: EASE },
});

export function HeroSection({ authenticated }: { authenticated: boolean }) {
  const ctaHref = authenticated ? "/dashboard" : "/login?next=/dashboard";

  return (
    <section className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden">
      <div aria-hidden className="absolute top-1/2 left-1/2 -z-10 size-[56rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(29,78,216,0.18),transparent_62%)]" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <motion.div {...fadeUp(0.05)}>
            <EyebrowBadge />
          </motion.div>

          <motion.h1 {...fadeUp(0.15)} className="mt-7 font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl lg:text-[4.4rem]">
            SMART PUSBEKMATAU<span className="text-gold">:</span>
            <span className="mt-3 block text-[0.52em] leading-tight font-medium text-mist">Central Command &amp; Integration System</span>
          </motion.h1>

          <motion.div {...fadeUp(0.28)} className="mt-7 flex items-center gap-4">
            <div className="hairline-tricolor w-24" />
            <span className="eyebrow !text-[0.58rem] text-haze">Pusat Pembekalan Materiel TNI AU</span>
          </motion.div>

          <motion.p {...fadeUp(0.36)} className="mt-6 max-w-xl text-base leading-relaxed text-mist sm:text-lg">
            Sistem Informasi Cerdas terintegrasi untuk Monitoring, FMS, SIMMAT, dan Logistik Pusbekmatau.{" "}
            <span className="text-ink">Presisi dalam setiap keputusan.</span>
          </motion.p>

          <PillarBar className="mt-8" delay={0.5} />

          <motion.div {...fadeUp(0.62)} className="mt-10 flex flex-wrap items-center gap-5">
            <Magnetic>
              <Link
                href={ctaHref}
                className="focus-ring group inline-flex h-12 items-center gap-3 rounded-xl bg-gradient-to-b from-gold-soft to-gold px-6 text-sm font-semibold text-abyss shadow-[0_14px_40px_-14px_rgba(212,175,55,0.7)] transition hover:brightness-105"
              >
                Masuk ke Command Center
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Magnetic>
            <span className="flex items-center gap-2 text-xs text-mist">
              <ShieldCheck className="size-4 text-steel" aria-hidden />
              Akses terlindungi peran &amp; sesi terenkripsi
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: "blur(14px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
          className="relative mx-auto w-full max-w-md"
        >
          <div aria-hidden className="absolute inset-0 rounded-full border border-line" />
          <div aria-hidden className="absolute inset-[9%] rounded-full border border-dashed border-line" />
          <div aria-hidden className="absolute inset-[18%] rounded-full border border-gold/20" />
          <div aria-hidden className="radar-sweep absolute inset-0 rounded-full" />
          <div className="relative flex aspect-square items-center justify-center">
            <Logo size={220} priority className="w-[52%] h-auto drop-shadow-[0_20px_60px_rgba(212,175,55,0.25)]" />
          </div>

          <div className="glass absolute -bottom-4 left-1/2 w-[86%] -translate-x-1/2 rounded-xl px-5 py-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-ink">
                <StatusDot /> Status Server Aktif
              </span>
              <span className="tabular text-mist">
                {MODULES.length} modul · {MODULE_GROUPS.length} klaster
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
