"use client";

import { Activity, Database, Layers, TrendingUp } from "lucide-react";
import { AnimatedCounter, GlowCard, Stagger, StaggerItem } from "./MotionWrappers";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import type { OverviewResponse } from "@/lib/types";

interface Kpi {
  label: string;
  value: number;
  suffix?: string;
  caption: string;
  icon: typeof Database;
  accent?: boolean;
  color: string;
  delta?: number | null;
}

function buildKpis(o: OverviewResponse): Kpi[] {
  const okYears = o.simmat.filter((s) => s.status === "ok");
  const first = okYears[0];
  const last = okYears[okYears.length - 1];
  const simmatGrowth = first && last && first !== last && first.records > 0 ? ((last.records - first.records) / first.records) * 100 : null;
  const m = o.monitoring;
  const monitoringDelta = m.y2025.records > 0 && m.y2026.status === "ok" ? ((m.y2026.records - m.y2025.records) / m.y2025.records) * 100 : null;

  return [
    { label: "Total Entri Terintegrasi", value: o.totals.records, caption: `Lintas ${o.totals.available} modul aktif`, icon: Database, accent: true, color: "#FBBF24" },
    { label: "Modul Basis Data Daring", value: o.totals.available, suffix: ` / ${o.totals.modules}`, caption: `${o.totals.fields} atribut data terpetakan`, icon: Layers, color: "#38BDF8" },
    {
      label: "Volume SIMMAT",
      value: okYears.reduce((s, y) => s + y.records, 0),
      caption: first && last ? `Pertumbuhan ${first.year}→${last.year}` : "Menunggu data SIMMAT",
      icon: TrendingUp,
      color: "#34D399",
      delta: simmatGrowth,
    },
    {
      label: "Monitoring 2026",
      value: m.y2026.records,
      caption: `Dibanding 2025: ${m.y2025.records.toLocaleString("id-ID")} entri`,
      icon: Activity,
      color: "#A78BFA",
      delta: monitoringDelta,
    },
  ];
}

export function KpiCards({ overview }: { overview: OverviewResponse }) {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {buildKpis(overview).map((kpi) => {
        const Icon = kpi.icon;
        return (
          <StaggerItem key={kpi.label}>
            <GlowCard className="h-full p-5">
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${kpi.color}, transparent)` }} />
              <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${kpi.color}, transparent 70%)` }} />
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-mist">{kpi.label}</p>
                <span className="rounded-lg border p-2" style={{ background: `${kpi.color}22`, borderColor: `${kpi.color}55` }}>
                  <Icon className="size-4" style={{ color: kpi.color }} aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: kpi.color }}>
                <AnimatedCounter value={kpi.value} />
                {kpi.suffix && <span className="tabular text-lg text-haze">{kpi.suffix}</span>}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {kpi.delta != null && (
                  <span
                    className={cn(
                      "tabular rounded px-1.5 py-0.5",
                      kpi.delta >= 0 ? "bg-steel/10 text-ice" : "bg-crimson/10 text-[#fca5a5]",
                    )}
                  >
                    {formatPercent(kpi.delta)}
                  </span>
                )}
                <span className="text-haze">{kpi.caption}</span>
              </div>
            </GlowCard>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
