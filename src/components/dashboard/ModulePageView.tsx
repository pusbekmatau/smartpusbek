"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ModulePage } from "@/lib/modules";
import { ModuleView } from "./ModuleView";

/** Renders a module page; pages with several data sheets get a tab bar (selected tab kept in `?tab=`). */
export function ModulePageView({ page }: { page: ModulePage }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (page.tabs.length === 1) return <ModuleView key={page.tabs[0].slug} module={page.tabs[0]} />;

  const active = page.tabs.find((t) => t.slug === params.get("tab")) ?? page.tabs[0];
  const select = (slug: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", slug);
    next.delete("q");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <>
      <div role="tablist" aria-label={page.title} className="mb-5 flex flex-wrap gap-1.5">
        {page.tabs.map((t) => {
          const on = t.slug === active.slug;
          return (
            <button
              key={t.slug}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => select(t.slug)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition ${
                on ? "border-gold/60 bg-gold/15 text-ink" : "border-white/10 text-mist hover:border-white/25 hover:text-ink"
              }`}
            >
              {t.tabLabel ?? t.title}
            </button>
          );
        })}
      </div>
      <ModuleView key={active.slug} module={{ ...active, title: `${page.title} · ${active.tabLabel ?? active.title}` }} />
    </>
  );
}
