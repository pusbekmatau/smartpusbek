import { BarChart3, Database, LayoutDashboard, Radar, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";
import { PAGES, getModule, getPage } from "./modules";
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

const links = (group: string): NavLink[] =>
  PAGES.filter((p) => p.group === group).map((p) => ({ href: `/dashboard/${p.slug}`, label: p.title }));

export const NAVIGATION: NavSection[] = [
  { id: "overview", label: "Ringkasan Eksekutif", icon: LayoutDashboard, href: "/dashboard" },
  { id: "monitoring", label: "Monitoring", icon: Radar, links: links("monitoring") },
  { id: "master", label: "Master Data & Penerimaan", icon: Database, links: links("master") },
  {
    id: "simmat",
    label: "SIMMAT (2021–2026)",
    icon: BarChart3,
    links: [...links("simmat"), { href: "/dashboard/simmat-comparison", label: "Komparasi Tren 2021–2026" }],
  },
  { id: "setriksa", label: "Integrasi Setriksa", icon: Workflow, links: links("setriksa") },
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
