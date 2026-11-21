import { MODULE_GROUPS, MODULES } from "./modules";
import { aggregate, numericColumns, preferredDimensions, profileColumns, sumColumn } from "./stats";
import type { Dataset, OverviewResponse } from "./types";

/** Loads one module; resolves to `null` when the module is unavailable. */
export type DatasetLoader = (slug: string, force: boolean) => Promise<Dataset | null>;

type Loaded = { slug: string; dataset: Dataset | null };

function pickComparisonDimension(a: Dataset, b: Dataset): string | null {
  const dimsA = preferredDimensions(profileColumns(a.columns, a.rows));
  const dimsB = new Set(preferredDimensions(profileColumns(b.columns, b.rows)).map((p) => p.name.toLowerCase()));
  return dimsA.find((p) => dimsB.has(p.name.toLowerCase()))?.name ?? null;
}

export async function buildOverview(load: DatasetLoader, force: boolean): Promise<OverviewResponse> {
  const loaded: Loaded[] = await Promise.all(
    MODULES.map(async (m) => {
      return { slug: m.slug, dataset: await load(m.slug, force) };
    }),
  );
  const bySlug = new Map(loaded.map((l) => [l.slug, l.dataset]));

  const modules = MODULES.map((m) => {
    const ds = bySlug.get(m.slug) ?? null;
    return {
      slug: m.slug,
      title: m.title,
      group: m.group,
      status: ds ? ("ok" as const) : ("error" as const),
      records: ds?.rows.length ?? 0,
      columns: ds?.columns.length ?? 0,
      syncedAt: ds?.syncedAt ?? null,
    };
  });

  const groups = MODULE_GROUPS.map((g) => {
    const members = modules.filter((m) => m.group === g.id);
    return { id: g.id, label: g.label, records: members.reduce((s, m) => s + m.records, 0), modules: members.length };
  });

  const simmatModules = MODULES.filter((m) => m.group === "simmat");
  const simmat = simmatModules.map((m, i) => {
    const records = bySlug.get(m.slug)?.rows.length ?? 0;
    const prevDs = i > 0 ? bySlug.get(simmatModules[i - 1].slug) : null;
    const prev = prevDs?.rows.length ?? 0;
    const status = bySlug.get(m.slug) ? ("ok" as const) : ("error" as const);
    return {
      year: m.year ?? 0,
      slug: m.slug,
      records,
      status,
      growth: status === "ok" && prevDs && prev > 0 ? ((records - prev) / prev) * 100 : null,
    };
  });

  const m25 = bySlug.get("monitoring-2025") ?? null;
  const m26 = bySlug.get("monitoring-2026") ?? null;
  let dimension: string | null = null;
  let comparison: OverviewResponse["monitoring"]["comparison"] = [];
  if (m25 && m26) {
    dimension = pickComparisonDimension(m26, m25);
    if (dimension) {
      const a = aggregate(m25.rows, dimension, null, 8);
      const b = aggregate(m26.rows, dimension, null, 8);
      const labels = [...new Set([...b.map((p) => p.label), ...a.map((p) => p.label)])].slice(0, 8);
      comparison = labels.map((label) => ({
        label,
        y2025: a.find((p) => p.label === label)?.value ?? 0,
        y2026: b.find((p) => p.label === label)?.value ?? 0,
      }));
    }
  }

  const highlights: OverviewResponse["highlights"] = [];
  for (const m of MODULES) {
    const ds = bySlug.get(m.slug);
    if (!ds) continue;
    const metric = numericColumns(profileColumns(ds.columns, ds.rows))[0];
    if (!metric) continue;
    const { total, count } = sumColumn(ds.rows, metric.name);
    if (count === 0) continue;
    highlights.push({ slug: m.slug, title: m.title, column: metric.name, total, average: total / count });
  }

  const ok = modules.filter((m) => m.status === "ok");
  return {
    generatedAt: new Date().toISOString(),
    mode: "live",
    totals: {
      modules: modules.length,
      available: ok.length,
      records: ok.reduce((s, m) => s + m.records, 0),
      fields: ok.reduce((s, m) => s + m.columns, 0),
    },
    groups,
    modules,
    simmat,
    monitoring: {
      y2025: { records: m25?.rows.length ?? 0, status: m25 ? "ok" : "error" },
      y2026: { records: m26?.rows.length ?? 0, status: m26 ? "ok" : "error" },
      dimension,
      comparison,
    },
    highlights,
  };
}

export interface SimmatTrendResponse {
  generatedAt: string;
  years: { year: number; slug: string; status: "ok" | "error"; records: number; fields: number }[];
  metrics: { column: string; values: { year: number; total: number | null }[] }[];
  dimension: string | null;
  breakdown: { label: string; values: Record<string, number> }[];
}

/** Cross-year comparison for SIMMAT: record volume, shared numeric metrics, and a shared category breakdown. */
export async function buildSimmatTrend(load: DatasetLoader, force: boolean): Promise<SimmatTrendResponse> {
  const simmat = MODULES.filter((m) => m.group === "simmat");
  type Entry = { module: (typeof simmat)[number]; dataset: Dataset | null };
  const loaded: Entry[] = await Promise.all(
    simmat.map(async (m): Promise<Entry> => {
      return { module: m, dataset: await load(m.slug, force) };
    }),
  );
  const available = loaded.filter((l): l is Entry & { dataset: Dataset } => l.dataset !== null);

  const lower = (s: string) => s.toLowerCase();
  const shared = (pick: (ds: Dataset) => string[]) => {
    if (available.length === 0) return [] as string[];
    const [first, ...rest] = available.map((l) => pick(l.dataset));
    return first.filter((name) => rest.every((names) => names.map(lower).includes(lower(name))));
  };
  const resolve = (ds: Dataset, name: string) => ds.columns.find((c) => lower(c) === lower(name)) ?? name;

  const sharedNumeric = shared((ds) => numericColumns(profileColumns(ds.columns, ds.rows)).map((p) => p.name)).slice(0, 6);
  const sharedDims = shared((ds) => preferredDimensions(profileColumns(ds.columns, ds.rows)).map((p) => p.name));
  const dimension = sharedDims[0] ?? null;

  const metrics = sharedNumeric.map((column) => ({
    column,
    values: loaded.map((l) => ({
      year: l.module.year ?? 0,
      total: l.dataset ? sumColumn(l.dataset.rows, resolve(l.dataset, column)).total : null,
    })),
  }));

  let breakdown: SimmatTrendResponse["breakdown"] = [];
  if (dimension) {
    const totals = new Map<string, Record<string, number>>();
    for (const l of available) {
      for (const point of aggregate(l.dataset.rows, resolve(l.dataset, dimension), null, 50)) {
        const entry = totals.get(point.label) ?? {};
        entry[String(l.module.year)] = point.value;
        totals.set(point.label, entry);
      }
    }
    breakdown = [...totals.entries()]
      .map(([label, values]) => ({ label, values }))
      .sort((a, b) => sumValues(b.values) - sumValues(a.values))
      .slice(0, 6);
  }

  return {
    generatedAt: new Date().toISOString(),
    years: loaded.map((l) => ({
      year: l.module.year ?? 0,
      slug: l.module.slug,
      status: l.dataset ? "ok" : "error",
      records: l.dataset?.rows.length ?? 0,
      fields: l.dataset?.columns.length ?? 0,
    })),
    metrics,
    dimension,
    breakdown,
  };
}

function sumValues(values: Record<string, number>): number {
  return Object.values(values).reduce((s, v) => s + v, 0);
}
