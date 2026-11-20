"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/layout/AppProviders";
import { EyebrowBadge } from "@/components/ui/EyebrowBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { formatCompact, formatDateTimeWIB, formatNumber } from "@/lib/format";
import { MODULE_GROUPS } from "@/lib/modules";
import type { OverviewResponse } from "@/lib/types";
import { useRemote } from "@/lib/use-remote";
import { OverviewCharts } from "./ChartsPanel";
import { KpiCards } from "./KpiCards";
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
          description="Gambaran terpadu seluruh modul Basis Data Server Pusbekmatau, dihitung langsung dari entitas data terkini."
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
          <KpiCards overview={data} />
          <OverviewCharts overview={data} />

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

          {data.highlights.length > 0 && (
            <Reveal delay={0.15}>
              <Panel eyebrow="Ringkasan Otomatis" title="Agregat Kolom Numerik Utama">
                <div className="thin-scroll overflow-x-auto px-1">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="text-haze">
                      <tr className="border-b border-line">
                        <th className="py-2.5 pr-4 font-medium">Modul</th>
                        <th className="py-2.5 pr-4 font-medium">Atribut</th>
                        <th className="py-2.5 pr-4 text-right font-medium">Total</th>
                        <th className="py-2.5 text-right font-medium">Rata-rata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.highlights.map((h) => (
                        <tr key={h.slug} className="border-b border-line/50 last:border-0">
                          <td className="py-2.5 pr-4 text-ink">
                            <Link href={`/dashboard/${h.slug}`} className="hover:text-gold-soft">
                              {h.title}
                            </Link>
                          </td>
                          <td className="max-w-56 truncate py-2.5 pr-4 text-mist">{h.column}</td>
                          <td className="tabular py-2.5 pr-4 text-right text-gold-soft">{formatNumber(h.total)}</td>
                          <td className="tabular py-2.5 text-right text-ink">{formatNumber(h.average)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </Reveal>
          )}
        </div>
      )}
    </>
  );
}
