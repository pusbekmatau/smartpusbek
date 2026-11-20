"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { NAVIGATION, type NavSection } from "@/lib/navigation";
import { useSession } from "./AppProviders";

function sectionIsActive(section: NavSection, pathname: string) {
  return section.href === pathname || section.links?.some((l) => l.href === pathname) === true;
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useSession();
  const sections = NAVIGATION.filter((s) => !s.roles || s.roles.includes(user.role));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, sectionIsActive(s, pathname)])),
  );

  useEffect(() => {
    const active = NAVIGATION.find((s) => sectionIsActive(s, pathname));
    if (active) setOpen((o) => (o[active.id] ? o : { ...o, [active.id]: true }));
  }, [pathname]);

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl px-5 pt-6 pb-5" onClick={onNavigate}>
        <Logo size={42} priority />
        <div className="min-w-0">
          <p className="font-display text-[1.02rem] leading-tight font-semibold tracking-wide text-ink">SMART PUSBEKMATAU</p>
          <p className="eyebrow mt-1 !text-[0.55rem] text-gold-soft">Centre of Excellence</p>
        </div>
      </Link>
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />

      <nav className="thin-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
        <ul className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = sectionIsActive(section, pathname);
            if (section.href) {
              return (
                <li key={section.id}>
                  <Link
                    href={section.href}
                    onClick={onNavigate}
                    className={cn(
                      "focus-ring relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                      active ? "bg-cobalt/15 text-ink" : "text-mist hover:bg-white/[0.03] hover:text-ink",
                    )}
                  >
                    {active && <motion.span layoutId="nav-indicator" className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-gold" />}
                    <Icon className={cn("size-4", active ? "text-gold-soft" : "text-haze")} aria-hidden />
                    {section.label}
                  </Link>
                </li>
              );
            }
            const expanded = open[section.id] ?? false;
            return (
              <li key={section.id}>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [section.id]: !expanded }))}
                  aria-expanded={expanded}
                  className={cn(
                    "focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                    active ? "text-ink" : "text-mist hover:bg-white/[0.03] hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-gold-soft" : "text-haze")} aria-hidden />
                  <span className="flex-1">{section.label}</span>
                  <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                    <ChevronDown className="size-3.5 text-haze" aria-hidden />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="ml-[1.35rem] overflow-hidden border-l border-line"
                    >
                      {section.links?.map((link) => {
                        const isActive = link.href === pathname;
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={onNavigate}
                              className={cn(
                                "focus-ring relative block rounded-r-lg py-2 pr-3 pl-4 text-[0.8rem] transition",
                                isActive ? "bg-cobalt/12 text-ink" : "text-mist hover:text-ink",
                              )}
                            >
                              {isActive && (
                                <motion.span layoutId="nav-indicator" className="absolute top-1.5 bottom-1.5 -left-px w-[2px] rounded-full bg-gold" />
                              )}
                              {link.label}
                            </Link>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="eyebrow !text-[0.55rem] text-haze">Pusat Pembekalan Materiel TNI AU</p>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-night/90 backdrop-blur-xl lg:block">
        <SidebarBody />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-abyss/80 backdrop-blur-sm" aria-label="Tutup navigasi" onClick={onClose} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="relative h-full w-[min(20rem,86vw)] border-r border-line bg-night"
            >
              <button onClick={onClose} className="focus-ring absolute top-5 right-3 rounded-lg p-1.5 text-mist hover:text-ink" aria-label="Tutup navigasi">
                <X className="size-4" />
              </button>
              <SidebarBody onNavigate={onClose} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
