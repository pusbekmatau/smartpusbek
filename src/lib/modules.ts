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
}

export const MODULE_GROUPS: readonly ModuleGroup[] = [
  { id: "monitoring", label: "Monitoring", description: "Pemantauan operasional tahunan" },
  { id: "master", label: "Master Data & Penerimaan", description: "Data induk, penerimaan, dan mitra" },
  { id: "simmat", label: "SIMMAT 2021–2026", description: "Sistem Informasi Manajemen Materiel" },
  { id: "setriksa", label: "Integrasi Setriksa", description: "Data terintegrasi Setriksa & Setlurmat" },
] as const;

export const MODULES: readonly ModuleDescriptor[] = [
  { slug: "monitoring-2025", title: "Monitoring 2025", group: "monitoring", year: 2025, description: "Rekam pemantauan kegiatan materiel tahun anggaran 2025." },
  { slug: "monitoring-2026", title: "Monitoring 2026", group: "monitoring", year: 2026, description: "Rekam pemantauan kegiatan materiel tahun anggaran 2026." },
  { slug: "master-dalang", title: "Master Dalang", group: "master", description: "Data induk pengendalian dan perencanaan materiel." },
  { slug: "master-ip-penerimaan", title: "Master IP Penerimaan", group: "master", description: "Data induk instruksi penerimaan materiel." },
  { slug: "rekapan-mitra", title: "Rekapan Mitra 2024–2026", group: "master", description: "Rekapitulasi laporan mitra periode 2024 hingga 2026." },
  { slug: "master-bspm", title: "Master BSPM Setpusbekmatau", group: "master", description: "Data induk BSPM Sekretariat Pusbekmatau." },
  { slug: "data-warranty", title: "Data Warranty", group: "master", description: "Registrasi dan status klaim garansi materiel." },
  { slug: "data-fms", title: "Data FMS", group: "master", description: "Data pengadaan Foreign Military Sales." },
  { slug: "data-sub-transit", title: "Data Sub Transit", group: "master", description: "Data pergerakan materiel di sub transit." },
  { slug: "simmat-2021", title: "SIMMAT 2021", group: "simmat", year: 2021, description: "Basis data SIMMAT tahun 2021." },
  { slug: "simmat-2022", title: "SIMMAT 2022", group: "simmat", year: 2022, description: "Basis data SIMMAT tahun 2022." },
  { slug: "simmat-2023", title: "SIMMAT 2023", group: "simmat", year: 2023, description: "Basis data SIMMAT tahun 2023." },
  { slug: "simmat-2024", title: "SIMMAT 2024", group: "simmat", year: 2024, description: "Basis data SIMMAT tahun 2024." },
  { slug: "simmat-2025", title: "SIMMAT 2025", group: "simmat", year: 2025, description: "Basis data SIMMAT tahun 2025." },
  { slug: "simmat-2026", title: "SIMMAT 2026", group: "simmat", year: 2026, description: "Basis data SIMMAT tahun 2026." },
  { slug: "data-setriksa", title: "Data Setriksa", group: "setriksa", description: "Data pemeriksaan terintegrasi Setriksa." },
  { slug: "ip-bspm-setlurmat", title: "IP & BSPM Maju Setlurmat", group: "setriksa", description: "Data IP & BSPM maju Setlurmat dari Setriksa." },
] as const;

const MODULE_INDEX = new Map(MODULES.map((m) => [m.slug, m]));

export function getModule(slug: string): ModuleDescriptor | undefined {
  return MODULE_INDEX.get(slug);
}

export function modulesInGroup(group: ModuleGroupId): ModuleDescriptor[] {
  return MODULES.filter((m) => m.group === group);
}

export const SIMMAT_MODULES = modulesInGroup("simmat");
