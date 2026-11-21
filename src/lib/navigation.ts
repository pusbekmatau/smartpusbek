import { Archive, ClipboardCheck, Inbox, LayoutDashboard, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { PAGES, SECTORS, getModule, getPage, type SectorId } from "./modules";
import type { Role } from "./types";

export interface NavLink {
  href: string;
  label: string;
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  links?: NavLink[];
  roles?: Role[];
}

const links = (sector: SectorId): NavLink[] =>
  PAGES.filter((p) => p.sector === sector).map((p) => ({ href: `/dashboard/${p.slug}`, label: p.title }));

const SECTOR_ICONS: Record<SectorId, LucideIcon> = { penerimaan: Inbox, pemeriksaan: ClipboardCheck, penyaluran: Send, arsip: Archive };

export const NAVIGATION: NavSection[] = [
  { id: "overview", label: "Ringkasan Eksekutif", icon: LayoutDashboard, href: "/dashboard" },
  ...SECTORS.map((sector): NavSection => ({
    id: sector.id,
    label: sector.label,
    icon: SECTOR_ICONS[sector.id],
    links:
      sector.id === "arsip"
        ? [...links(sector.id), { href: "/dashboard/simmat-comparison", label: "Komparasi Tren 2021–2026" }]
        : links(sector.id),
  })),
  {
    id: "admin",
    label: "Administrasi Sistem",
    icon: ShieldCheck,
    roles: ["ADMIN"],
    links: [
      { href: "/admin/users", label: "Manajemen Pengguna" },
      { href: "/admin/audit-logs", label: "Log Audit Aktivitas" },
    ],
  },
];

/** Breadcrumb trail for a pathname, e.g. ["Command Center", "SIMMAT (2021–2026)", "SIMMAT 2024"]. */
export function breadcrumbFor(pathname: string): string[] {
  if (pathname === "/dashboard") return ["Command Center", "Ringkasan Eksekutif"];
  for (const section of NAVIGATION) {
    const link = section.links?.find((l) => l.href === pathname);
    if (link) return ["Command Center", section.label, link.label];
  }
  const slug = pathname.split("/")[2];
  const page = slug ? getPage(slug) : undefined;
  const mod = page ?? (slug ? getModule(slug) : undefined);
  return mod ? ["Command Center", mod.title] : ["Command Center"];
}
