"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ExecBreakdown, ExecHeadline, ExecMetric, ExecSector, ExecutiveSummary, Tone } from "@/lib/executive";
import { hrefForModule } from "@/lib/modules";
import { formatNumber } from "@/lib/format";
import { AnimatedCounter, GlowCard, Stagger, StaggerItem } from "./MotionWrappers";
import { Panel } from "./Panel";

const TONE: Record<Tone, string> = { good: "#34D399", info: "#38BDF8", warn: "#FBBF24", bad: "#F43F5E" };
const SECTOR_TONE = ["#38BDF8", "#FBBF24", "#34D399", "#A78BFA", "#F472B6"];

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden border border-line bg-white/5">
      <div className="dither-fill h-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  );
}

export function ExecutiveHeadlines({ items }: { items: ExecHeadline[] }) {
  if (items.length === 0) return null;
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((h) => {
        const color = TONE[h.tone];
        const numeric = /^\d[\d.]*$/.test(h.value) ? Number(h.value.replace(/\./g, "")) : null;
        return (
          <StaggerItem key={h.label}>
            <Link href={hrefForModule(h.slug)} className="focus-ring block h-full rounded-2xl">
              <GlowCard className="h-full p-5">
                <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                <p className="text-xs font-medium text-mist">{h.label}</p>
                <p className="tabular mt-3 text-3xl font-semibold tracking-tight" style={{ color }}>
                  {numeric !== null ? <AnimatedCounter value={numeric} /> : h.value}
                </p>
                {h.pct !== undefined && (
                  <div className="mt-3">
                    <Meter pct={h.pct} color={color} />
                  </div>
                )}
                <p className="mt-2 text-xs text-haze">{h.caption}</p>
              </GlowCard>
            </Link>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

function MetricRow({ m, color }: { m: ExecMetric; color: string }) {
  const c = TONE[m.tone] ?? color;
  return (
    <li>
      <Link href={hrefForModule(m.slug)} className="focus-ring block rounded-md py-1.5 hover:bg-white/[0.03]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-xs text-mist">{m.label}</span>
          <span className="tabular shrink-0 text-sm font-semibold" style={{ color: m.pct !== undefined ? c : color }}>
            {m.value}
          </span>
        </div>
        {m.pct !== undefined && (
          <div className="mt-1">
            <Meter pct={m.pct} color={c} />
          </div>
        )}
        {m.caption && <p className="mt-1 text-[0.68rem] leading-snug text-haze">{m.caption}</p>}
      </Link>
    </li>
  );
}

function MiniBars({ b, color }: { b: ExecBreakdown; color: string }) {
  const max = Math.max(...b.points.map((p) => p.value), 1);
  return (
    <div className="mt-4 border-t border-line pt-3">
      <Link href={hrefForModule(b.slug)} className="eyebrow !text-[0.56rem] text-haze hover:text-ink">
        {b.title}
      </Link>
      <ul className="mt-2 space-y-1.5">
        {b.points.map((p) => (
          <li key={p.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 text-[0.7rem]">
            <span className="truncate text-mist">{p.label}</span>
            <span className="tabular text-ink">{formatNumber(p.value)}</span>
            <div className="col-span-2 h-1 bg-white/5">
              <div className="h-full" style={{ width: `${(p.value / max) * 100}%`, backgroundColor: color, opacity: 0.85 }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectorCard({ s, color }: { s: ExecSector; color: string }) {
  return (
    <section className="glass flex h-full flex-col rounded-2xl border-t-[3px] p-5" style={{ borderTopColor: color, backgroundImage: `linear-gradient(180deg, ${color}18, transparent 40%)` }}>
      <h3 className="font-display text-base font-semibold text-ink">{s.label}</h3>
      <p className="mt-1 text-xs text-haze">{s.caption}</p>
      <ul className="mt-3 space-y-1">
        {s.metrics.length === 0 ? <li className="text-xs text-haze">Menunggu data sheet.</li> : s.metrics.map((m) => <MetricRow key={m.label} m={m} color={color} />)}
      </ul>
      {s.breakdown && <MiniBars b={s.breakdown} color={color} />}
    </section>
  );
}

export function ExecutiveSectors({ sectors }: { sectors: ExecSector[] }) {
  return (
    <Stagger className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3" step={0.05}>
      {sectors.map((s, i) => (
        <StaggerItem key={s.id}>
          <SectorCard s={s} color={SECTOR_TONE[i % SECTOR_TONE.length]} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export function IpMasukChart({ data }: { data: ExecutiveSummary["ipMasukBulanan"] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Panel eyebrow="Arus Masuk" title="IP Masuk Pusbekmatau per Bulan">
      <p className="px-1 pb-3 text-xs text-haze">
        {formatNumber(total)} IP dalam {data.length} bulan terakhir yang berisi data.
      </p>
      <div className="flex h-44 items-end gap-1.5 px-1 sm:gap-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="tabular text-[0.62rem] text-mist">{formatNumber(d.value)}</span>
            <div
              className={cn("dither-fill w-full", i === data.length - 1 && "ring-1 ring-white/40")}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, backgroundColor: i === data.length - 1 ? "#FBBF24" : "#38BDF8" }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="w-full truncate text-center text-[0.6rem] text-haze">{d.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
