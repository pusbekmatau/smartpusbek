"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/layout/AppProviders";
import { EyebrowBadge } from "@/components/ui/EyebrowBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { formatCompact, formatDateTimeWIB } from "@/lib/format";
import { MODULE_GROUPS } from "@/lib/modules";
import type { OverviewResponse } from "@/lib/types";
import { useRemote } from "@/lib/use-remote";
import { ExecutiveHeadlines, ExecutiveSectors, IpMasukChart } from "./ExecutiveBoard";
import { Reveal, Stagger, StaggerItem } from "./MotionWrappers";
import { PageHeading, Panel } from "./Panel";
import { StatusCard } from "./StatusCard";

export function OverviewView() {
  const { user } = useSession();
  const { data, error, loading, reload } = useRemote<OverviewResponse>("/api/overview");

  return (
    <>
      <Reveal>
        <PageHeading
          eyebrow="Ringkasan Eksekutif"
          title={`Selamat bertugas, ${user.name.split(" ")[0]}.`}
          description="Indikator penting tiap sektor: capaian layanan IP, progres buka takah, nilai kontrak, dan arus barang. Dihitung dari isi data terkini."
          actions={
            data && (
              <div className="flex flex-col items-end gap-2">
                <EyebrowBadge />
                <p className="tabular text-[0.7rem] text-haze">Diperbarui {formatDateTimeWIB(data.generatedAt)}</p>
              </div>
            )
          }
        />
      </Reveal>

      {error && !data ? (
        <StatusCard message={error.message} onRetry={() => reload(true)} retrying={loading} />
      ) : !data ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <ExecutiveHeadlines items={data.executive.headlines} />
          <ExecutiveSectors sectors={data.executive.sectors} />
          <IpMasukChart data={data.executive.ipMasukBulanan} />

          <Reveal delay={0.1}>
            <Panel eyebrow="Status Repositori Terpusat" title="Kesiapan Modul Data">
              <Stagger className="grid gap-3 px-1 sm:grid-cols-2 xl:grid-cols-4" step={0.03}>
                {MODULE_GROUPS.map((group) => (
                  <StaggerItem key={group.id} className="space-y-2">
                    <p className="eyebrow px-1 !text-[0.56rem] text-haze">{group.label}</p>
                    {data.modules
                      .filter((m) => m.group === group.id)
                      .map((m) => (
                        <Link
                          key={m.slug}
                          href={`/dashboard/${m.slug}`}
                          className="focus-ring group flex items-center justify-between gap-3 rounded-lg border border-line bg-abyss/40 px-3 py-2.5 transition hover:border-line-strong hover:bg-cobalt/10"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <StatusDot tone={m.status === "ok" ? "ok" : "warn"} />
                            <span className="truncate text-xs text-ink">{m.title}</span>
                          </span>
                          <span className={cn("tabular flex items-center gap-1 text-xs", m.status === "ok" ? "text-mist" : "text-gold-soft")}>
                            {m.status === "ok" ? formatCompact(m.records) : "Dibatasi"}
                            <ArrowUpRight className="size-3 opacity-0 transition group-hover:opacity-100" aria-hidden />
                          </span>
                        </Link>
                      ))}
                  </StaggerItem>
                ))}
              </Stagger>
            </Panel>
          </Reveal>

        </div>
      )}
    </>
  );
}
