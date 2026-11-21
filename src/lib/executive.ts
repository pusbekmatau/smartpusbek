/**
 * Ringkasan Eksekutif: indikator penting per sektor, dihitung dari isi data (bukan jumlah entri).
 * Pure functions — dipakai oleh `buildOverview`. Setiap indikator dilewati bila kolomnya tidak ditemukan,
 * jadi perubahan header di spreadsheet tidak merusak halaman.
 */
import { SECTORS, type SectorId } from "./modules";
import { parseNumber } from "./stats";
import type { Dataset } from "./types";

export type Tone = "good" | "warn" | "bad" | "info";

export interface ExecMetric {
  label: string;
  /** Teks nilai utama yang sudah diformat (mis. "82%" atau "1,2 M"). */
  value: string;
  caption?: string;
  /** 0–100, bila metrik berupa capaian (menampilkan bar). */
  pct?: number;
  tone: Tone;
  slug: string;
}

export interface ExecBreakdown {
  title: string;
  slug: string;
  points: { label: string; value: number }[];
}

export interface ExecSector {
  id: SectorId;
  label: string;
  caption: string;
  metrics: ExecMetric[];
  breakdown: ExecBreakdown | null;
}

export interface ExecHeadline {
  label: string;
  value: string;
  caption: string;
  tone: Tone;
  slug: string;
  pct?: number;
}

export interface ExecMonth {
  label: string;
  value: number;
}

export interface ExecutiveSummary {
  headlines: ExecHeadline[];
  sectors: ExecSector[];
  /** IP masuk per bulan (12 bulan terakhir yang berisi data). */
  ipMasukBulanan: ExecMonth[];
}

type Bag = Map<string, Dataset | null>;

const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const compact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 1 })} T`;
  if (abs >= 1e9) return `${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return nf.format(n);
};
const rupiah = (n: number) => `Rp ${compact(n)}`;

function findCol(ds: Dataset, ...patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const hit = ds.columns.find((c) => p.test(c.trim()));
    if (hit) return hit;
  }
  return null;
}

const val = (ds: Dataset, col: string, i: number) => (ds.rows[i].values[col] ?? "").trim();

/** Baris yang benar-benar berisi data (kolom kunci terisi). */
function liveRows(ds: Dataset, keyCol: string | null): number[] {
  const out: number[] = [];
  for (let i = 0; i < ds.rows.length; i++) {
    if (keyCol ? val(ds, keyCol, i) : Object.values(ds.rows[i].values).some((v) => v && v.trim())) out.push(i);
  }
  return out;
}

function completion(ds: Dataset, keyCol: RegExp[], doneCol: RegExp[]): { total: number; done: number; pct: number } | null {
  const key = findCol(ds, ...keyCol);
  const done = findCol(ds, ...doneCol);
  if (!key || !done) return null;
  const rows = liveRows(ds, key);
  if (rows.length === 0) return null;
  const d = rows.filter((i) => val(ds, done, i)).length;
  return { total: rows.length, done: d, pct: (d / rows.length) * 100 };
}

function sum(ds: Dataset, col: string, rows?: number[]): number {
  let t = 0;
  for (const i of rows ?? ds.rows.keys()) {
    const n = parseNumber(val(ds, col, i));
    if (n !== null) t += n;
  }
  return t;
}

function top(ds: Dataset, col: string, n: number, weight?: string): { label: string; value: number }[] {
  const m = new Map<string, { label: string; value: number }>();
  for (let i = 0; i < ds.rows.length; i++) {
    const raw = val(ds, col, i);
    if (!raw) continue;
    const k = raw.toLowerCase();
    const w = weight ? (parseNumber(val(ds, weight, i)) ?? 0) : 1;
    const e = m.get(k);
    if (e) e.value += w;
    else m.set(k, { label: raw, value: w });
  }
  return [...m.values()].sort((a, b) => b.value - a.value).slice(0, n);
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12 };

/** "3-Jan-25", "4-Des-2025", "21/11/2026" → { y, m } */
export function parseMonth(raw: string): { y: number; m: number } | null {
  const s = raw.trim();
  const r = /(\d{1,2})[-/.\s]([A-Za-z]{3,9}|\d{1,2})[-/.\s](\d{2,4})/.exec(s);
  if (!r) return null;
  let m: number | undefined;
  if (/^\d+$/.test(r[2])) m = Number(r[2]);
  else m = MONTHS[r[2].slice(0, 3).toLowerCase()];
  if (!m || m < 1 || m > 12) return null;
  let y = Number(r[3]);
  if (y < 100) y += 2000;
  if (y < 2015 || y > 2100) return null;
  return { y, m };
}

const MONTH_LABEL = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function monthly(ds: Dataset, col: string, keep = 12): ExecMonth[] {
  const counts = new Map<number, number>();
  for (let i = 0; i < ds.rows.length; i++) {
    const p = parseMonth(val(ds, col, i));
    if (!p) continue;
    const k = p.y * 12 + (p.m - 1);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-keep)
    .map(([k, value]) => ({ label: `${MONTH_LABEL[(k % 12) + 1]} ${String(Math.floor(k / 12)).slice(2)}`, value }));
}

const toneFor = (pct: number): Tone => (pct >= 80 ? "good" : pct >= 50 ? "info" : pct >= 25 ? "warn" : "bad");

/** Rata-rata persentase; menerima 0–1 maupun 0–100. */
function avgPercent(ds: Dataset, col: string, rows: number[]): number | null {
  const nums: number[] = [];
  for (const i of rows) {
    const n = parseNumber(val(ds, col, i));
    if (n !== null) nums.push(n);
  }
  if (nums.length === 0) return null;
  const max = Math.max(...nums);
  const scale = max <= 1.0001 ? 100 : 1;
  return Math.min(100, (nums.reduce((s, n) => s + n, 0) / nums.length) * scale);
}

// ---------------------------------------------------------------------------

function ipMetric(bag: Bag, slug: string, label: string, add: (m: ExecMetric) => void) {
  const ds = bag.get(slug);
  if (!ds) return null;
  const c = completion(ds, [/^nomor ip$/i, /nomor ip/i], [/ip terlayani/i]);
  if (!c) return null;
  add({
    label,
    value: `${c.pct.toFixed(0)}%`,
    caption: `${nf.format(c.done)} dari ${nf.format(c.total)} IP terlayani · ${nf.format(c.total - c.done)} tertunda`,
    pct: c.pct,
    tone: toneFor(c.pct),
    slug,
  });
  return c;
}

function bspmMetric(bag: Bag, slug: string, label: string, add: (m: ExecMetric) => void) {
  const ds = bag.get(slug);
  if (!ds) return;
  const c = completion(ds, [/^nomor bspm$/i, /nomor bspm/i], [/ip penyelesaian/i, /^tgl ip$/i]);
  if (!c) return;
  const nilaiCol = findCol(ds, /nilai perolehan/i);
  const nilai = nilaiCol ? sum(ds, nilaiCol, liveRows(ds, findCol(ds, /nomor bspm/i))) : 0;
  add({
    label,
    value: `${c.pct.toFixed(0)}%`,
    caption: `${nf.format(c.done)} dari ${nf.format(c.total)} BSPM sudah ber-IP${nilai ? ` · nilai ${rupiah(nilai)}` : ""}`,
    pct: c.pct,
    tone: toneFor(c.pct),
    slug,
  });
}

export function buildExecutive(bag: Bag): ExecutiveSummary {
  const headlines: ExecHeadline[] = [];
  const sectors: ExecSector[] = SECTORS.map((s) => ({ id: s.id, label: s.label, caption: s.caption, metrics: [], breakdown: null }));
  const sec = (id: SectorId) => sectors.find((s) => s.id === id)!;

  // ---- Sektor Penyaluran ---------------------------------------------------
  const penyaluran = sec("penyaluran");
  const ipTotals = { total: 0, done: 0 };
  for (const [slug, label] of [
    ["monitoring-2026-ip-salur", "IP Salur 2026"],
    ["monitoring-2026", "IP GPP 2026"],
    ["monitoring-2026-ip-p3k", "IP P3K 2026"],
  ] as const) {
    const c = ipMetric(bag, slug, label, (m) => penyaluran.metrics.push(m));
    if (c) {
      ipTotals.total += c.total;
      ipTotals.done += c.done;
    }
  }
  for (const [slug, label] of [
    ["monitoring-2026-bspm-salur", "BSPM Salur 2026"],
    ["monitoring-2026-bspm-rpc", "BSPM RPC 2026"],
    ["monitoring-2026-bspm-gpp", "BSPM GPP 2026"],
  ] as const) {
    bspmMetric(bag, slug, label, (m) => penyaluran.metrics.push(m));
  }

  const takah = bag.get("monitoring-2026-progress-buka-takah");
  if (takah) {
    const key = findCol(takah, /^kontrak$/i);
    const pc = findCol(takah, /^persentase$/i);
    const prog = findCol(takah, /^progress$/i);
    if (key) {
      const rows = liveRows(takah, key);
      const avg = pc ? avgPercent(takah, pc, rows) : null;
      const m: ExecMetric = {
        label: "Progress Buka Takah",
        value: avg !== null ? `${avg.toFixed(0)}%` : nf.format(rows.length),
        caption: `${nf.format(rows.length)} kontrak dipantau${avg !== null ? " · rata-rata progres" : ""}`,
        tone: avg !== null ? toneFor(avg) : "info",
        slug: "monitoring-2026-progress-buka-takah",
      };
      if (avg !== null) m.pct = avg;
      penyaluran.metrics.push(m);
      if (!penyaluran.breakdown && prog) {
        const pts = top(takah, prog, 6);
        if (pts.length) penyaluran.breakdown = { title: "Tahap Progress Buka Takah", slug: "monitoring-2026-progress-buka-takah", points: pts };
      }
      if (avg !== null) headlines.push({ label: "Progress Buka Takah", value: `${avg.toFixed(0)}%`, caption: `${nf.format(rows.length)} kontrak dipantau`, tone: toneFor(avg), slug: "monitoring-2026-progress-buka-takah", pct: avg });
    }
  }

  const kontrol = bag.get("monitoring-2026-kontrol-takah");
  if (kontrol) {
    const key = findCol(kontrol, /^kontrak$/i);
    if (key) {
      const rows = liveRows(kontrol, key);
      const nilaiCol = findCol(kontrol, /^nilai$/i);
      const pend = findCol(kontrol, /keterangan pending/i);
      const pending = pend ? rows.filter((i) => val(kontrol, pend, i)).length : 0;
      const nilai = nilaiCol ? sum(kontrol, nilaiCol, rows) : 0;
      penyaluran.metrics.push({
        label: "Kontrol Takah",
        value: nilai ? rupiah(nilai) : nf.format(rows.length),
        caption: `${nf.format(rows.length)} kontrak${pending ? ` · ${nf.format(pending)} pending` : ""}`,
        tone: pending > rows.length * 0.3 ? "warn" : "info",
        slug: "monitoring-2026-kontrol-takah",
      });
      headlines.push({ label: "Nilai Kontrak Terkontrol", value: nilai ? rupiah(nilai) : nf.format(rows.length), caption: `${nf.format(rows.length)} kontrak${pending ? ` · ${nf.format(pending)} pending` : ""}`, tone: "info", slug: "monitoring-2026-kontrol-takah" });
    }
  }

  const dalang = bag.get("master-dalang");
  if (dalang) {
    const key = findCol(dalang, /^no sppb$/i);
    const berat = findCol(dalang, /^berat$/i);
    const koli = findCol(dalang, /^koli$/i);
    const tujuan = findCol(dalang, /^tujuan$/i);
    if (key) {
      const rows = liveRows(dalang, key);
      const kg = berat ? sum(dalang, berat, rows) : 0;
      penyaluran.metrics.push({
        label: "Pengiriman Dalang",
        value: `${nf.format(rows.length)} SPPB`,
        caption: `${kg ? `${nf.format(kg)} kg` : ""}${kg && koli ? " · " : ""}${koli ? `${nf.format(sum(dalang, koli, rows))} koli` : ""}`.trim() || undefined,
        tone: "info",
        slug: "master-dalang",
      });
      if (tujuan) {
        const pts = top(dalang, tujuan, 6, berat ?? undefined);
        if (pts.length && !penyaluran.breakdown) penyaluran.breakdown = { title: "Tujuan Kirim Terberat (kg)", slug: "master-dalang", points: pts };
      }
    }
  }

  // ---- Data IP dan BSPM ----------------------------------------------------
  const penerimaan = sec("penerimaan");
  const ipm = bag.get("master-ip-penerimaan");
  let ipMasukBulanan: ExecMonth[] = [];
  if (ipm) {
    const c = ipMetric(bag, "master-ip-penerimaan", "Master IP Penerimaan", (m) => penerimaan.metrics.push(m));
    if (c) headlines.unshift({ label: "IP Terlayani", value: `${c.pct.toFixed(0)}%`, caption: `${nf.format(c.done)} dari ${nf.format(c.total)} IP · ${nf.format(c.total - c.done)} tertunda`, tone: toneFor(c.pct), slug: "master-ip-penerimaan", pct: c.pct });
    const masuk = findCol(ipm, /tgl masuk pusbek/i);
    if (masuk) ipMasukBulanan = monthly(ipm, masuk);
    const kom = findCol(ipm, /^komoditi$/i);
    if (kom) {
      const pts = top(ipm, kom, 6);
      if (pts.length) penerimaan.breakdown = { title: "Komoditi IP Terbanyak", slug: "master-ip-penerimaan", points: pts };
    }
  }
  bspmMetric(bag, "master-bspm", "Master BSPM", (m) => penerimaan.metrics.push(m));
  const mb = bag.get("master-bspm");
  if (mb) {
    const nilaiCol = findCol(mb, /nilai perolehan/i);
    const key = findCol(mb, /nomor bspm/i);
    if (nilaiCol && key) {
      const nilai = sum(mb, nilaiCol, liveRows(mb, key));
      if (nilai) penerimaan.metrics.push({ label: "Nilai Perolehan BSPM", value: rupiah(nilai), caption: "Total seluruh BSPM tercatat", tone: "info", slug: "master-bspm" });
    }
  }
  // Backlog gabungan IP monitoring 2026
  if (ipTotals.total > 0) {
    const pct = (ipTotals.done / ipTotals.total) * 100;
    headlines.splice(1, 0, { label: "IP Salur Tertunda 2026", value: nf.format(ipTotals.total - ipTotals.done), caption: `${pct.toFixed(0)}% dari ${nf.format(ipTotals.total)} IP sudah terlayani`, tone: toneFor(pct), slug: "monitoring-2026-ip-salur", pct });
  }

  // ---- Data Gudang Sambung -------------------------------------------------
  const gudang = sec("pemeriksaan");
  const warranty = bag.get("data-warranty");
  if (warranty) {
    const c = completion(warranty, [/^kontrak$/i, /^nama barang$/i], [/tanggal riksa/i, /berita acara wc/i, /ba anname/i]);
    if (c) gudang.metrics.push({ label: "Warranty Diperiksa", value: `${c.pct.toFixed(0)}%`, caption: `${nf.format(c.done)} dari ${nf.format(c.total)} barang sudah diriksa`, pct: c.pct, tone: toneFor(c.pct), slug: "data-warranty" });
    const kom = findCol(warranty, /^komoditi$/i);
    if (kom) {
      const pts = top(warranty, kom, 6);
      if (pts.length) gudang.breakdown = { title: "Komoditi Warranty", slug: "data-warranty", points: pts };
    }
  }
  const sub = bag.get("data-sub-transit");
  if (sub) {
    const rows = liveRows(sub, null);
    const st = findCol(sub, /^status$/i, /status/i);
    const pts = st ? top(sub, st, 4) : [];
    gudang.metrics.push({ label: "Sub Transit", value: nf.format(rows.length), caption: pts.length ? pts.map((p) => `${p.label}: ${nf.format(p.value)}`).join(" · ") : "Barang tercatat di sub transit", tone: "info", slug: "data-sub-transit" });
    if (!gudang.breakdown && st && pts.length) gudang.breakdown = { title: "Status Sub Transit", slug: "data-sub-transit", points: top(sub, st, 6) };
  }
  const fms = bag.get("data-fms");
  if (fms) gudang.metrics.push({ label: "Data FMS", value: nf.format(liveRows(fms, null).length), caption: "Paket pengadaan FMS tercatat", tone: "info", slug: "data-fms" });
  const setr = bag.get("data-setriksa");
  if (setr) gudang.metrics.push({ label: "Data Setriksa", value: nf.format(liveRows(setr, null).length), caption: "Hasil pemeriksaan terintegrasi", tone: "info", slug: "data-setriksa" });
  const ipbs = bag.get("ip-bspm-setlurmat");
  if (ipbs) gudang.metrics.push({ label: "IP & BSPM Setlurmat", value: nf.format(liveRows(ipbs, null).length), caption: "Dimajukan ke Setlurmat", tone: "info", slug: "ip-bspm-setlurmat" });

  // ---- Data Form dari Mitra ------------------------------------------------
  const mitra = sec("mitra");
  const rm = bag.get("rekapan-mitra");
  if (rm) {
    const ts = findCol(rm, /^timestamp$/i);
    const rows = liveRows(rm, ts);
    mitra.metrics.push({ label: "Form Masuk", value: nf.format(rows.length), caption: "Pengajuan penyerahan barang dari mitra", tone: "info", slug: "rekapan-mitra" });
    if (ts) {
      const bulan = monthly(rm, ts, 6);
      const last = bulan[bulan.length - 1];
      if (last) mitra.metrics.push({ label: `Form ${last.label}`, value: nf.format(last.value), caption: "Bulan terakhir yang berisi data", tone: "info", slug: "rekapan-mitra" });
      if (bulan.length) mitra.breakdown = { title: "Form Masuk per Bulan", slug: "rekapan-mitra", points: bulan };
    }
    const st = findCol(rm, /^status kontrak$/i);
    if (st) {
      const pts = top(rm, st, 4);
      if (pts.length) mitra.metrics.push({ label: "Status Kontrak", value: pts[0].label, caption: pts.map((p) => `${p.label}: ${nf.format(p.value)}`).join(" · "), tone: "info", slug: "rekapan-mitra" });
    }
  }

  // ---- SIMMAT & Arsip ------------------------------------------------------
  const arsip = sec("arsip");
  const years = [2021, 2022, 2023, 2024, 2025, 2026]
    .map((y) => ({ y, ds: bag.get(`simmat-${y}`) }))
    .filter((x): x is { y: number; ds: Dataset } => !!x.ds)
    .map((x) => ({ label: String(x.y), value: liveRows(x.ds, null).length }));
  if (years.length) {
    const lastY = years[years.length - 1];
    const prev = years[years.length - 2];
    const growth = prev && prev.value > 0 ? ((lastY.value - prev.value) / prev.value) * 100 : null;
    arsip.metrics.push({ label: `SIMMAT ${lastY.label}`, value: nf.format(lastY.value), caption: growth !== null ? `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% dibanding ${prev.label}` : "Entri tahun berjalan", tone: growth !== null && growth < 0 ? "warn" : "good", slug: `simmat-${lastY.label}` });
    arsip.breakdown = { title: "Volume SIMMAT per Tahun", slug: "simmat-2026", points: years };
  }
  const m25 = bag.get("monitoring-2025");
  if (m25) {
    const done = completion(m25, [/^kontrak$/i, /^nomor ip$/i], [/ip terlayani/i]);
    if (done) arsip.metrics.push({ label: "Monitoring 2025", value: `${done.pct.toFixed(0)}%`, caption: `${nf.format(done.done)} dari ${nf.format(done.total)} terlayani`, pct: done.pct, tone: toneFor(done.pct), slug: "monitoring-2025" });
  }

  return { headlines: headlines.slice(0, 4), sectors, ipMasukBulanan };
}
