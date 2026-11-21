/**
 * Column profiling & aggregation utilities shared by the server (overview KPIs)
 * and the client (per-module charts). Pure functions, no I/O.
 */
import type { DataRow, SeriesPoint } from "./types";

export type ColumnKind = "numeric" | "categorical" | "text" | "empty";

export interface ColumnProfile {
  name: string;
  kind: ColumnKind;
  filled: number;
  distinct: number;
}

const INDEX_COLUMN = /^(no|no\.|nomor|nmr|#|urut|no urut|nomor urut)$/i;

/**
 * Parses Indonesian and international number formats:
 * "1.234.567", "1.234,50", "Rp 2.500.000", "12,5%", "1,234.50", "(3.000)".
 */
export function parseNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/^(rp\.?|idr|usd|\$)\s*/i, "").replace(/%$/, "").replace(/\s/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let normalised: string;
  if (lastDot !== -1 && lastComma !== -1) {
    normalised = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot !== -1) {
    normalised = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  } else if (lastComma !== -1) {
    normalised = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else {
    normalised = s;
  }
  const value = Number(normalised);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

export function isIndexColumn(name: string): boolean {
  return INDEX_COLUMN.test(name.trim());
}

export function profileColumns(columns: string[], rows: DataRow[]): ColumnProfile[] {
  return columns.map((name) => {
    let filled = 0;
    let numeric = 0;
    const distinct = new Set<string>();
    for (const row of rows) {
      const value = (row.values[name] ?? "").trim();
      if (!value) continue;
      filled += 1;
      distinct.add(value.toLowerCase());
      if (parseNumber(value) !== null) numeric += 1;
    }
    let kind: ColumnKind = "text";
    if (filled === 0) kind = "empty";
    else if (numeric / filled >= 0.85 && !isIndexColumn(name)) kind = "numeric";
    else if (distinct.size >= 2 && distinct.size <= 40 && distinct.size / filled <= 0.6) kind = "categorical";
    return { name, kind, filled, distinct: distinct.size };
  });
}

/** Ranks categorical columns: favours status-like names and moderate cardinality. */
export function preferredDimensions(profiles: ColumnProfile[]): ColumnProfile[] {
  const statusLike = /status|ket|progres|kategori|jenis|satuan|kondisi|tahap|sumber|mitra|lanud|skadron|unit|tipe|type/i;
  return profiles
    .filter((p) => p.kind === "categorical")
    .sort((a, b) => {
      const sa = statusLike.test(a.name) ? 1 : 0;
      const sb = statusLike.test(b.name) ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return b.filled - a.filled || a.distinct - b.distinct;
    });
}

export function numericColumns(profiles: ColumnProfile[]): ColumnProfile[] {
  return profiles.filter((p) => p.kind === "numeric").sort((a, b) => b.filled - a.filled);
}

/**
 * Groups rows by `dimension`; value is row count or the sum of `metric`.
 * Long tails are folded into "Lainnya".
 */
export const EMPTY_LABEL = "(Kosong)";
export const OTHERS_LABEL = "Lainnya";

/** True when a raw cell value belongs to the chart bucket `label` (as produced by `aggregate`). */
export function matchesBucket(raw: string | undefined, label: string): boolean {
  const v = (raw ?? "").trim();
  if (label === EMPTY_LABEL) return v === "";
  return v.toLowerCase() === label.toLowerCase();
}

export function aggregate(rows: DataRow[], dimension: string, metric: string | null, limit = 10): SeriesPoint[] {
  const buckets = new Map<string, { label: string; value: number }>();
  for (const row of rows) {
    const raw = (row.values[dimension] ?? "").trim();
    const label = raw || "(Kosong)";
    const key = label.toLowerCase();
    const amount = metric ? (parseNumber(row.values[metric]) ?? 0) : 1;
    const bucket = buckets.get(key);
    if (bucket) bucket.value += amount;
    else buckets.set(key, { label, value: amount });
  }
  const sorted = [...buckets.values()].sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1).reduce((sum, p) => sum + p.value, 0);
  return [...head, { label: "Lainnya", value: rest }];
}

export function sumColumn(rows: DataRow[], column: string): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const n = parseNumber(row.values[column]);
    if (n !== null) {
      total += n;
      count += 1;
    }
  }
  return { total, count };
}

export function compareValues(a: string, b: string): number {
  const na = parseNumber(a);
  const nb = parseNumber(b);
  if (na !== null && nb !== null) return na - nb;
  return a.localeCompare(b, "id", { numeric: true, sensitivity: "base" });
}
