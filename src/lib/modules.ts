/**
 * Public module catalogue — safe to import from client components.
 * It never contains source locations; those live only in the Apps Script backend (`apps-script/Code.gs`).
 */

export type ModuleGroupId = "monitoring" | "master" | "simmat" | "setriksa";

export interface ModuleGroup {
  id: ModuleGroupId;
  label: string;
  description: string;
}

export interface ModuleDescriptor {
  slug: string;
  title: string;
  group: ModuleGroupId;
  description: string;
  year?: number;
  /** Label shown on the tab when the module lives inside a multi-tab page. */
  tabLabel?: string;
}

export const MODULE_GROUPS: readonly ModuleGroup[] = [
  { id: "monitoring", label: "Monitoring", description: "Pemantauan operasional tahunan" },
  { id: "master", label: "Master Data & Penerimaan", description: "Data induk, penerimaan, dan mitra" },
  { id: "simmat", label: "SIMMAT 2021–2026", description: "Sistem Informasi Manajemen Materiel" },
  { id: "setriksa", label: "Integrasi Setriksa", description: "Data terintegrasi Setriksa & Setlurmat" },
] as const;

export const MODULES: readonly ModuleDescriptor[] = [
  { slug: "monitoring-2025", title: "Monitoring 2025", group: "monitoring", year: 2025, description: "Rekam pemantauan kegiatan materiel tahun anggaran 2025." },
  { slug: "monitoring-2026-dashboard", title: "Monitoring 2026 · Dashboard Monitoring", tabLabel: "Dashboard Monitoring", group: "monitoring", year: 2026, description: "Tab DASHBOARD MONITORING pada workbook Monitoring 2026." },
  { slug: "monitoring-2026-progress-buka-takah", title: "Monitoring 2026 · Progress Buka Takah", tabLabel: "Progress Buka Takah", group: "monitoring", year: 2026, description: "Tab PROGRESS BUKA TAKAH 2026 pada workbook Monitoring 2026." },
  { slug: "monitoring-2026-kontrol-takah", title: "Monitoring 2026 · Kontrol Takah", tabLabel: "Kontrol Takah", group: "monitoring", year: 2026, description: "Tab KONTROL TAKAH pada workbook Monitoring 2026." },
  { slug: "monitoring-2026-ip-salur", title: "Monitoring 2026 · IP Salur", tabLabel: "IP Salur", group: "monitoring", year: 2026, description: "Tab IP SALUR pada workbook Monitoring 2026." },
  { slug: "monitoring-2026-ip-p3k", title: "Monitoring 2026 · IP P3K", tabLabel: "IP P3K", group: "monitoring", year: 2026, description: "Tab IP P3K pada workbook Monitoring 2026." },
  { slug: "monitoring-2026", title: "Monitoring 2026 · IP GPP", tabLabel: "IP GPP", group: "monitoring", year: 2026, description: "Rekam pemantauan kegiatan materiel tahun anggaran 2026 (tab IP GPP)." },
  { slug: "monitoring-2026-bspm-salur", title: "Monitoring 2026 · BSPM Salur", tabLabel: "BSPM Salur", group: "monitoring", year: 2026, description: "Tab BSPM SALUR pada workbook Monitoring 2026." },
  { slug: "monitoring-2026-bspm-rpc", title: "Monitoring 2026 · BSPM RPC", tabLabel: "BSPM RPC", group: "monitoring", year: 2026, description: "Tab BSPM RPC pada workbook Monitoring 2026." },
  { slug: "monitoring-2026-bspm-gpp", title: "Monitoring 2026 · BSPM GPP", tabLabel: "BSPM GPP", group: "monitoring", year: 2026, description: "Tab BSPM GPP pada workbook Monitoring 2026." },
  { slug: "master-dalang", title: "Master Dalang", group: "master", description: "Data induk pengendalian dan perencanaan materiel." },
  { slug: "master-ip-penerimaan", title: "Master IP Penerimaan", group: "master", description: "Data induk instruksi penerimaan materiel." },
  { slug: "rekapan-mitra", title: "Rekapan Mitra 2024–2026", group: "master", description: "Rekapitulasi laporan mitra periode 2024 hingga 2026." },
  { slug: "master-bspm", title: "Master BSPM Setpusbekmatau", group: "master", description: "Data induk BSPM Sekretariat Pusbekmatau." },
  { slug: "data-warranty", title: "Data Warranty", group: "master", description: "Registrasi dan status klaim garansi materiel." },
  { slug: "data-fms", title: "Data FMS", group: "master", description: "Data pengadaan Foreign Military Sales." },
  { slug: "data-sub-transit", title: "Data Sub Transit", group: "master", description: "Data pergerakan materiel di sub transit." },
  { slug: "simmat-2021", title: "SIMMAT 2021", tabLabel: "2021", group: "simmat", year: 2021, description: "Basis data SIMMAT tahun 2021." },
  { slug: "simmat-2022", title: "SIMMAT 2022", tabLabel: "2022", group: "simmat", year: 2022, description: "Basis data SIMMAT tahun 2022." },
  { slug: "simmat-2023", title: "SIMMAT 2023", tabLabel: "2023", group: "simmat", year: 2023, description: "Basis data SIMMAT tahun 2023." },
  { slug: "simmat-2024", title: "SIMMAT 2024", tabLabel: "2024", group: "simmat", year: 2024, description: "Basis data SIMMAT tahun 2024." },
  { slug: "simmat-2025", title: "SIMMAT 2025", tabLabel: "2025", group: "simmat", year: 2025, description: "Basis data SIMMAT tahun 2025." },
  { slug: "simmat-2026", title: "SIMMAT 2026", tabLabel: "2026", group: "simmat", year: 2026, description: "Basis data SIMMAT tahun 2026." },
  { slug: "data-setriksa", title: "Data Setriksa", tabLabel: "Data Setriksa", group: "setriksa", description: "Data pemeriksaan terintegrasi Setriksa." },
  { slug: "ip-bspm-setlurmat", title: "IP & BSPM Maju Setlurmat", tabLabel: "IP & BSPM Maju Setlurmat", group: "setriksa", description: "Data IP & BSPM maju Setlurmat dari Setriksa." },
] as const;

const MODULE_INDEX = new Map(MODULES.map((m) => [m.slug, m]));

export function getModule(slug: string): ModuleDescriptor | undefined {
  return MODULE_INDEX.get(slug.split("~")[0]);
}

export function modulesInGroup(group: ModuleGroupId): ModuleDescriptor[] {
  return MODULES.filter((m) => m.group === group);
}

export const SIMMAT_MODULES = modulesInGroup("simmat");

export type SectorId = "penerimaan" | "pemeriksaan" | "penyaluran" | "mitra" | "arsip";

export interface Sector {
  id: SectorId;
  label: string;
  caption: string;
}

export const SECTORS: readonly Sector[] = [
  { id: "penerimaan", label: "Data IP dan BSPM", caption: "Master IP Penerimaan dan Master BSPM" },
  { id: "pemeriksaan", label: "Data Gudang Sambung", caption: "Warranty, sub transit, Setriksa, dan FMS" },
  { id: "penyaluran", label: "Sektor Penyaluran", caption: "Monitoring 2026 dan Master Dalang" },
  { id: "mitra", label: "Data Form dari Mitra", caption: "Rekapan laporan mitra 2024–2026" },
  { id: "arsip", label: "SIMMAT & Arsip", caption: "SIMMAT 2021–2026 dan Monitoring 2025" },
] as const;

const SECTOR_BY_SLUG: Record<string, SectorId> = {
  "master-ip-penerimaan": "penerimaan",
  "master-bspm": "penerimaan",
  "data-warranty": "pemeriksaan",
  "data-sub-transit": "pemeriksaan",
  "data-setriksa": "pemeriksaan",
  "ip-bspm-setlurmat": "pemeriksaan",
  "data-fms": "pemeriksaan",
  "rekapan-mitra": "mitra",
  "master-dalang": "penyaluran",
  "monitoring-2025": "arsip",
};

export function sectorOf(m: ModuleDescriptor): SectorId {
  if (SECTOR_BY_SLUG[m.slug]) return SECTOR_BY_SLUG[m.slug];
  if (m.group === "simmat") return "arsip";
  if (m.group === "monitoring") return "penyaluran";
  return "arsip";
}

/** A routable dashboard page: one module, or several modules shown as tabs. */
export interface ModulePage {
  slug: string;
  title: string;
  group: ModuleGroupId;
  sector: SectorId;
  description: string;
  /**
   * single   – one data sheet.
   * static   – several independent modules shown as tabs.
   * workbook – one spreadsheet; its sheets are listed live (spreadsheet order) as tabs.
   * years    – one spreadsheet per year (tabs), each of which lists its own sheets.
   */
  kind: "single" | "static" | "workbook" | "years";
  tabs: ModuleDescriptor[];
}

const MULTI_PAGES: Record<string, { slug: string; title: string; description: string }> = {
  monitoring: { slug: "monitoring-2026", title: "Monitoring 2026", description: "Rekam pemantauan kegiatan materiel tahun anggaran 2026, satu tab per sheet." },
  simmat: { slug: "simmat", title: "SIMMAT 2021–2026", description: "Basis data SIMMAT per tahun, satu tab per tahun." },
  setriksa: { slug: "setriksa", title: "Integrasi Setriksa", description: "Data terintegrasi Setriksa & Setlurmat, satu tab per sheet." },
};

function buildPages(): ModulePage[] {
  const pages: ModulePage[] = [];
  const seen = new Set<string>();
  for (const m of MODULES) {
    if (m.tabLabel) {
      const key = m.group;
      if (seen.has(key)) continue;
      seen.add(key);
      const meta = MULTI_PAGES[key];
      pages.push({ ...meta, group: m.group, sector: sectorOf(m), kind: key === "monitoring" ? "workbook" : "years", tabs: MODULES.filter((x) => x.group === key && x.tabLabel) });
    } else {
      pages.push({ slug: m.slug, title: m.title, group: m.group, sector: sectorOf(m), description: m.description, kind: "workbook", tabs: [m] });
    }
  }
  return pages;
}

export const PAGES: readonly ModulePage[] = buildPages();
const PAGE_INDEX = new Map(PAGES.map((p) => [p.slug, p]));

export function getPage(slug: string): ModulePage | undefined {
  return PAGE_INDEX.get(slug);
}

/** Page + tab that show a given data module. */
export function locateModule(slug: string): { page: ModulePage; tab: string } | undefined {
  const page = PAGES.find((p) => p.tabs.some((t) => t.slug === slug));
  return page ? { page, tab: slug } : undefined;
}

export function hrefForModule(slug: string): string {
  const loc = locateModule(slug);
  if (!loc) return `/dashboard/${slug}`;
  return loc.page.tabs.length > 1 ? `/dashboard/${loc.page.slug}?tab=${slug}` : `/dashboard/${loc.page.slug}`;
}
