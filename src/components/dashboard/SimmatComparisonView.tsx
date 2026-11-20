"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/cn";
import { formatCompact, formatNumber, formatPercent } from "@/lib/format";
import type { SimmatTrendResponse } from "@/lib/overview";
import { useRemote } from "@/lib/use-remote";
import { AXIS, GlassTooltip, GRID, SERIES, truncateLabel } from "./chart-theme";
import { AnimatedCounter, GlowCard, Reveal, Stagger, StaggerItem } from "./MotionWrappers";
import { PageHeading, Panel } from "./Panel";
import { StatusCard } from "./StatusCard";

export function SimmatComparisonView() {
  const { data, error, loading, reload } = useRemote<SimmatTrendResponse>("/api/overview/simmat");
  const [metric, setMetric] = useState<string | null>(null);

  const activeMetric = data?.metrics.find((m) => m.column === metric) ?? data?.metrics[0] ?? null;
  const yearKeys = data?.years.filter((y) => y.status === "ok").map((y) => String(y.year)) ?? [];

  const volume = useMemo(
    () =>
      data?.years.map((y, i, all) => {
        const prev = all[i - 1];
        return {
          label: String(y.year),
          value: y.records,
          growth: prev && prev.status === "ok" && y.status === "ok" && prev.records > 0 ? ((y.records - prev.records) / prev.records) * 100 : null,
          status: y.status,
        };
      }) ?? [],
    [data],
  );

  return (
    <>
      <Reveal>
        <PageHeading
          eyebrow="SIMMAT 2021–2026"
          title="Komparasi Tren Enam Tahun"
          description="Perbandingan volume entri, metrik numerik bersama, dan distribusi kategori lintas tahun basis data SIMMAT."
        />
      </Reveal>

      {error && !data ? (
        <StatusCard message={error.message} onRetry={() => reload(true)} retrying={loading} />
      ) : !data ? (
        <div className="space-y-5">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {volume.map((y) => (
              <StaggerItem key={y.label}>
                <GlowCard className="p-4">
                  <p className="tabular text-xs text-haze">{y.label}</p>
                  {y.status === "ok" ? (
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      <AnimatedCounter value={y.value} />
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-gold-soft">Dibatasi</p>
                  )}
                  <p className={cn("tabular mt-1 text-[0.7rem]", y.growth == null ? "text-haze" : y.growth >= 0 ? "text-ice" : "text-[#fca5a5]")}>
                    {y.growth == null ? "—" : `${formatPercent(y.growth)} YoY`}
                  </p>
                </GlowCard>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel eyebrow="Volume" title="Jumlah Entri per Tahun">
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={volume} margin={{ left: 0, right: 16, top: 8 }}>
                    <defs>
                      <linearGradient id="sv-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID} vertical={false} />
                    <XAxis dataKey="label" {...AXIS} />
                    <YAxis {...AXIS} width={52} tickFormatter={formatCompact} />
                    <Tooltip content={GlassTooltip} />
                    <Area type="monotone" dataKey="value" name="Entri" stroke={SERIES[0]} strokeWidth={2} fill="url(#sv-fill)" animationDuration={1100} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              eyebrow="Metrik Numerik Bersama"
              title={activeMetric ? `Σ ${activeMetric.column}` : "Metrik Numerik"}
              actions={
                data.metrics.length > 1 && (
                  <select
                    aria-label="Pilih metrik"
                    value={activeMetric?.column ?? ""}
                    onChange={(e) => setMetric(e.target.value)}
                    className="focus-ring h-8 max-w-52 rounded-lg border border-line bg-abyss/70 px-2.5 text-xs text-ink"
                  >
                    {data.metrics.map((m) => (
                      <option key={m.column} value={m.column}>
                        {m.column}
                      </option>
                    ))}
                  </select>
                )
              }
            >
              {activeMetric ? (
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={activeMetric.values.map((v) => ({ label: String(v.year), value: v.total ?? 0 }))} margin={{ left: 0, right: 16, top: 8 }}>
                      <CartesianGrid {...GRID} vertical={false} />
                      <XAxis dataKey="label" {...AXIS} />
                      <YAxis {...AXIS} width={60} tickFormatter={formatCompact} />
                      <Tooltip content={GlassTooltip} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                      <Bar dataKey="value" name={activeMetric.column} fill={SERIES[1]} radius={[5, 5, 0, 0]} animationDuration={1100} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="flex h-72 items-center justify-center text-xs text-haze">Tidak ditemukan atribut numerik yang sama di seluruh tahun.</p>
              )}
            </Panel>
          </div>

          <Panel eyebrow="Distribusi Kategori" title={data.dimension ? `Komposisi ${data.dimension} per Tahun` : "Komposisi Kategori"}>
            {data.breakdown.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart
                    data={data.breakdown.map((b) => ({ label: b.label, ...Object.fromEntries(yearKeys.map((y) => [y, b.values[y] ?? 0])) }))}
                    margin={{ left: 0, right: 16, top: 8 }}
                  >
                    <CartesianGrid {...GRID} vertical={false} />
                    <XAxis dataKey="label" {...AXIS} interval={0} tickFormatter={(v: string) => truncateLabel(v, 16)} />
                    <YAxis {...AXIS} width={52} tickFormatter={formatCompact} />
                    <Tooltip content={GlassTooltip} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                    {yearKeys.map((y, i) => (
                      <Bar key={y} dataKey={y} name={y} fill={SERIES[i % SERIES.length]} radius={[4, 4, 0, 0]} animationDuration={1100} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="flex h-40 items-center justify-center text-xs text-haze">Tidak ditemukan atribut kategori yang sama di seluruh tahun.</p>
            )}
            <p className="tabular px-2 pt-2 text-[0.68rem] text-haze">
              Total lintas tahun: {formatNumber(data.years.reduce((s, y) => s + y.records, 0))} entri
            </p>
          </Panel>
        </div>
      )}
    </>
  );
}
