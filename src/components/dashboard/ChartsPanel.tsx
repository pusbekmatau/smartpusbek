"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";
import { formatCompact, formatNumber } from "@/lib/format";
import { aggregate, numericColumns, OTHERS_LABEL, preferredDimensions, profileColumns } from "@/lib/stats";
import type { DataRow, OverviewResponse } from "@/lib/types";
import { AXIS, GlassTooltip, GRID, PIE_SERIES, SERIES, truncateLabel } from "./chart-theme";
import { Panel } from "./Panel";

const ANIM = { isAnimationActive: true, animationDuration: 1100, animationEasing: "ease-out" as const };

function Empty({ text }: { text: string }) {
  return <div className="flex h-64 items-center justify-center text-center text-xs text-haze">{text}</div>;
}

// ---------------------------------------------------------------------------
// Overview charts
// ---------------------------------------------------------------------------

export function OverviewCharts({ overview }: { overview: OverviewResponse }) {
  const volume = overview.modules
    .filter((m) => m.status === "ok")
    .map((m) => ({ label: m.title, value: m.records }))
    .sort((a, b) => b.value - a.value);
  const trend = overview.simmat.map((s) => ({ label: String(s.year), value: s.records }));
  const groups = overview.groups.filter((g) => g.records > 0).map((g) => ({ label: g.label, value: g.records }));
  const { comparison, dimension } = overview.monitoring;

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Panel eyebrow="Volume Lintas Modul" title="Komparasi Volume Data" className="xl:col-span-7">
        {volume.length === 0 ? (
          <Empty text="Belum ada modul yang tersinkronisasi." />
        ) : (
          <div style={{ height: Math.max(280, volume.length * 30) }}>
            <ResponsiveContainer>
              <BarChart data={volume} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid {...GRID} horizontal={false} />
                <XAxis type="number" {...AXIS} tickFormatter={formatCompact} />
                <YAxis type="category" dataKey="label" width={170} {...AXIS} tickFormatter={(v: string) => truncateLabel(v, 24)} />
                <Tooltip content={GlassTooltip} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                <Bar dataKey="value" name="Entri" radius={[0, 6, 6, 0]} barSize={14} {...ANIM}>
                  {volume.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? SERIES[1] : SERIES[0]} fillOpacity={i === 0 ? 0.95 : 0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 xl:col-span-5">
        <Panel eyebrow="SIMMAT 2021–2026" title="Tren Volume Tahunan">
          <div className="h-60">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ left: 0, right: 16, top: 8 }}>
                <defs>
                  <linearGradient id="simmat-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES[1]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SERIES[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} vertical={false} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} width={48} tickFormatter={formatCompact} />
                <Tooltip content={GlassTooltip} />
                <Area type="monotone" dataKey="value" name="Entri" stroke={SERIES[1]} strokeWidth={2} fill="url(#simmat-fill)" {...ANIM} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel eyebrow="Distribusi Kategori" title="Komposisi per Klaster">
          {groups.length === 0 ? <Empty text="Belum ada data." /> : <Donut data={groups} />}
        </Panel>
      </div>

      <Panel
        eyebrow="Monitoring 2025 vs 2026"
        title={dimension ? `Komparasi berdasarkan ${dimension}` : "Komparasi Monitoring"}
        className="xl:col-span-12"
      >
        {comparison.length === 0 ? (
          <Empty
            text={
              overview.monitoring.y2025.status === "error" || overview.monitoring.y2026.status === "error"
                ? "Salah satu modul Monitoring belum tersinkronisasi."
                : "Tidak ditemukan atribut kategori yang sama pada kedua tahun."
            }
          />
        ) : (
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={comparison} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid {...GRID} vertical={false} />
                <XAxis dataKey="label" {...AXIS} interval={0} tickFormatter={(v: string) => truncateLabel(v, 16)} />
                <YAxis {...AXIS} width={48} tickFormatter={formatCompact} />
                <Tooltip content={GlassTooltip} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                <Bar dataKey="y2025" name="2025" fill={SERIES[0]} radius={[5, 5, 0, 0]} {...ANIM} />
                <Bar dataKey="y2026" name="2026" fill={SERIES[1]} radius={[5, 5, 0, 0]} {...ANIM} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative h-52">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" {...ANIM}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_SERIES[i % PIE_SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={GlassTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-lg text-ink">{formatCompact(total)}</span>
          <span className="text-[0.6rem] tracking-widest text-haze uppercase">Total</span>
        </div>
      </div>
      <ul className="space-y-2 text-xs">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-mist">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: PIE_SERIES[i % PIE_SERIES.length] }} />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="tabular text-ink">{total ? ((d.value / total) * 100).toFixed(1).replace(".", ",") : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-module adaptive chart
// ---------------------------------------------------------------------------

type ChartKind = "bar" | "pie" | "line";
const KINDS: { id: ChartKind; label: string }[] = [
  { id: "bar", label: "Bar" },
  { id: "pie", label: "Pie" },
  { id: "line", label: "Line" },
];

const selectClass =
  "focus-ring h-8 max-w-48 rounded-lg border border-line bg-abyss/70 px-2.5 text-xs text-ink transition hover:border-line-strong";

/**
 * Detects categorical & numeric columns from the live rows and renders an
 * interactive chart. Recomputes on every edit/insert because it derives from `rows`.
 */
export interface ChartSelection {
  column: string;
  value: string;
}
type SelectHandler = (column: string, value: string) => void;

/** Slices/bars of the "Lainnya" bucket mix several values, so they cannot be drilled into. */
const clickable = (label: unknown): label is string => typeof label === "string" && label !== OTHERS_LABEL;
/** Category label of a clicked recharts element (bar item or pie sector). */
const labelOf = (d: unknown): unknown => {
  const x = d as { payload?: { label?: unknown }; label?: unknown; name?: unknown } | null;
  return x?.payload?.label ?? x?.label ?? x?.name;
};
const dim = (selected: ChartSelection | null, column: string | null, label: string) =>
  selected && selected.column === column && selected.value.toLowerCase() !== label.toLowerCase() ? 0.3 : 1;

function ManualChart({ columns, rows, selected, onSelect }: { columns: string[]; rows: DataRow[]; selected: ChartSelection | null; onSelect: SelectHandler }) {
  const profiles = useMemo(() => profileColumns(columns, rows), [columns, rows]);
  const dimensions = useMemo(() => preferredDimensions(profiles), [profiles]);
  const metrics = useMemo(() => numericColumns(profiles), [profiles]);

  const [dimension, setDimension] = useState<string | null>(null);
  const [metric, setMetric] = useState<string>("");
  const [kind, setKind] = useState<ChartKind>("bar");

  const activeDimension = dimension && dimensions.some((d) => d.name === dimension) ? dimension : (dimensions[0]?.name ?? null);
  const activeMetric = metric && metrics.some((m) => m.name === metric) ? metric : null;

  const data = useMemo(
    () => (activeDimension ? aggregate(rows, activeDimension, activeMetric, kind === "pie" ? 7 : 12) : []),
    [rows, activeDimension, activeMetric, kind],
  );
  const metricLabel = activeMetric ? `Σ ${activeMetric}` : "Jumlah entri";

  return (
    <Panel
      eyebrow="Grafik Manual"
      title={activeDimension ? `Distribusi ${activeDimension}` : "Grafik Manual"}
      actions={
        dimensions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Dimensi" className={selectClass} value={activeDimension ?? ""} onChange={(e) => setDimension(e.target.value)}>
              {dimensions.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <select aria-label="Metrik" className={selectClass} value={activeMetric ?? ""} onChange={(e) => setMetric(e.target.value)}>
              <option value="">Jumlah entri</option>
              {metrics.map((m) => (
                <option key={m.name} value={m.name}>
                  Σ {m.name}
                </option>
              ))}
            </select>
            <div className="relative flex rounded-lg border border-line p-0.5" role="tablist" aria-label="Jenis grafik">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  role="tab"
                  aria-selected={kind === k.id}
                  onClick={() => setKind(k.id)}
                  className={cn("focus-ring relative rounded-md px-2.5 py-1 text-xs transition", kind === k.id ? "text-ink" : "text-haze hover:text-mist")}
                >
                  {kind === k.id && <motion.span layoutId="chart-kind" className="absolute inset-0 rounded-md border border-gold/40 bg-gold/[0.08]" />}
                  <span className="relative">{k.label}</span>
                </button>
              ))}
            </div>
          </div>
        )
      }
    >
      {!activeDimension ? (
        <Empty text="Modul ini belum memiliki atribut kategori yang dapat divisualisasikan." />
      ) : (
        <div className="h-72">
          <ResponsiveContainer>
            {kind === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius="48%" outerRadius="85%" paddingAngle={2} stroke="none" cursor="pointer" onClick={(d) => activeDimension && clickable(labelOf(d)) && onSelect(activeDimension, labelOf(d) as string)} {...ANIM}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={PIE_SERIES[i % PIE_SERIES.length]} fillOpacity={dim(selected, activeDimension, d.label)} />
                  ))}
                </Pie>
                <Tooltip content={GlassTooltip} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11, color: "#94A3B8", maxWidth: "45%" }}
                  formatter={(v: string) => truncateLabel(v, 26)}
                />
              </PieChart>
            ) : kind === "line" ? (
              <LineChart
                data={data}
                margin={{ left: 0, right: 16, top: 8 }}
                style={{ cursor: "pointer" }}
                onClick={(st) => activeDimension && clickable(st?.activeLabel) && onSelect(activeDimension, st.activeLabel as string)}
              >
                <CartesianGrid {...GRID} vertical={false} />
                <XAxis dataKey="label" {...AXIS} tickFormatter={(v: string) => truncateLabel(v)} />
                <YAxis {...AXIS} width={52} tickFormatter={formatCompact} />
                <Tooltip content={GlassTooltip} />
                <Line type="monotone" dataKey="value" name={metricLabel} stroke={SERIES[1]} strokeWidth={2} dot={{ r: 3, fill: SERIES[1] }} {...ANIM} />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid {...GRID} vertical={false} />
                <XAxis dataKey="label" {...AXIS} tickFormatter={(v: string) => truncateLabel(v)} />
                <YAxis {...AXIS} width={52} tickFormatter={formatCompact} />
                <Tooltip content={GlassTooltip} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                <Bar dataKey="value" name={metricLabel} radius={[5, 5, 0, 0]} cursor="pointer" onClick={(d) => activeDimension && clickable(labelOf(d)) && onSelect(activeDimension, labelOf(d) as string)} {...ANIM}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={PIE_SERIES[i % PIE_SERIES.length]} fillOpacity={dim(selected, activeDimension, d.label) * 0.95} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {activeDimension && (
        <p className="tabular px-2 pt-1 text-[0.68rem] text-haze">
          {data.length} kategori · {formatNumber(rows.length)} entri dianalisis
        </p>
      )}
    </Panel>
  );
}

const AUTO_CHARTS = 3;

/** One compact chart for a single dimension: donut when there are few categories, bars otherwise. */
function AutoChart({ rows, dimension, selected, onSelect }: { rows: DataRow[]; dimension: string; selected: ChartSelection | null; onSelect: SelectHandler }) {
  const donut = useMemo(() => aggregate(rows, dimension, null, 6), [rows, dimension]);
  const useDonut = donut.length <= 4;
  const data = useMemo(() => (useDonut ? donut : aggregate(rows, dimension, null, 8)), [rows, dimension, useDonut, donut]);
  return (
    <Panel eyebrow="Statistik" title={`Distribusi ${dimension}`}>
      <div className="h-56">
        <ResponsiveContainer>
          {useDonut ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius="52%" outerRadius="86%" paddingAngle={2} stroke="none" cursor="pointer" onClick={(d) => clickable(labelOf(d)) && onSelect(dimension, labelOf(d) as string)} {...ANIM}>
                {data.map((d, i) => (
                  <Cell key={i} fill={PIE_SERIES[i % PIE_SERIES.length]} fillOpacity={dim(selected, dimension, d.label)} />
                ))}
              </Pie>
              <Tooltip content={GlassTooltip} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} formatter={(v: string) => truncateLabel(v, 22)} />
            </PieChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" {...AXIS} tickFormatter={formatCompact} />
              <YAxis type="category" dataKey="label" {...AXIS} width={92} interval={0} tickFormatter={(v: string) => truncateLabel(v, 14)} />
              <Tooltip content={GlassTooltip} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
              <Bar dataKey="value" name="Jumlah entri" radius={[0, 5, 5, 0]} cursor="pointer" onClick={(d) => clickable(labelOf(d)) && onSelect(dimension, labelOf(d) as string)} {...ANIM}>
                {data.map((d, i) => (
                  <Cell key={i} fill={PIE_SERIES[i % PIE_SERIES.length]} fillOpacity={dim(selected, dimension, d.label)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/**
 * Shows the few most informative charts automatically; any other column or metric
 * can still be charted by hand through "Grafik manual".
 */
export function ModuleChart({ columns, rows, selected, onSelect }: { columns: string[]; rows: DataRow[]; selected: ChartSelection | null; onSelect: SelectHandler }) {
  const profiles = useMemo(() => profileColumns(columns, rows), [columns, rows]);
  const dimensions = useMemo(() => preferredDimensions(profiles).filter((d) => d.distinct > 1).slice(0, AUTO_CHARTS), [profiles]);
  const [manual, setManual] = useState(false);

  return (
    <div className="space-y-4">
      {dimensions.length > 0 && (
        <div className={cn("grid gap-4", dimensions.length === 1 ? "" : dimensions.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3")}>
          {dimensions.map((d) => (
            <AutoChart key={d.name} rows={rows} dimension={d.name} selected={selected} onSelect={onSelect} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.7rem] text-haze">
          {dimensions.length === 0 ? "Sheet ini belum punya kolom kategori untuk grafik otomatis." : `${formatNumber(rows.length)} entri dianalisis · klik batang/irisan untuk menampilkan datanya di tabel`}
        </p>
        <button type="button" onClick={() => setManual((v) => !v)} className="focus-ring rounded-lg border border-line px-3 py-1.5 text-xs text-mist transition hover:border-line-strong hover:text-ink">
          {manual ? "Sembunyikan grafik manual" : "+ Grafik manual"}
        </button>
      </div>
      {manual && <ManualChart columns={columns} rows={rows} selected={selected} onSelect={onSelect} />}
    </div>
  );
}
