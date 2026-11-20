"use client";

import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatNumber } from "@/lib/format";

export const SERIES = ["#3B82F6", "#D4AF37", "#C83E3B", "#60A5FA", "#E5C158", "#1D4ED8", "#94A3B8"] as const;

/** Part-to-whole palette: blue-dominant, crimson reserved for the smallest trailing slice. */
export const PIE_SERIES = ["#3B82F6", "#D4AF37", "#60A5FA", "#1D4ED8", "#E5C158", "#94A3B8", "#C83E3B"] as const;

export const AXIS = {
  stroke: "rgba(148,163,184,0.35)",
  tick: { fill: "#94A3B8", fontSize: 11, fontFamily: "var(--font-sans)" },
  tickLine: false,
  axisLine: { stroke: "rgba(59,130,246,0.16)" },
} as const;

export const GRID = { stroke: "rgba(59,130,246,0.08)", strokeDasharray: "3 6" } as const;

/** Glassmorphism tooltip shared by every chart. */
export function GlassTooltip({ active, payload, label }: Partial<TooltipContentProps<ValueType, NameType>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass min-w-40 rounded-lg px-3.5 py-2.5 text-xs shadow-xl shadow-black/50">
      {label !== undefined && <p className="mb-1.5 max-w-60 truncate font-medium text-ink">{String(label)}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-mist">
              <span className="size-2 rounded-sm" style={{ background: (p.color ?? p.payload?.fill) as string }} />
              {p.name}
            </span>
            <span className="tabular text-ink">{formatNumber(Number(p.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function truncateLabel(value: string, max = 14): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
