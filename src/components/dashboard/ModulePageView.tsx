"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { ModuleDescriptor, ModulePage } from "@/lib/modules";
import { useRemote } from "@/lib/use-remote";
import { ModuleView } from "./ModuleView";

interface SheetInfo {
  gid: number;
  name: string;
}

function TabBar({ label, tabs, active, onSelect, size = "md" }: { label: string; tabs: { id: string; label: string }[]; active: string; onSelect: (id: string) => void; size?: "md" | "sm" }) {
  if (tabs.length <= 1) return null;
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onSelect(t.id)}
            className={`rounded-lg border font-medium uppercase transition ${size === "sm" ? "px-3 py-1.5 text-[0.68rem] tracking-wide" : "px-3.5 py-2 text-xs"} ${
              on ? "border-gold/60 bg-gold/15 text-ink" : "border-white/10 text-mist hover:border-white/25 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Renders the sheets of one spreadsheet as tabs, in the same order as the spreadsheet itself. */
function WorkbookView({ base, title, fallback, sheetParam, onSheet }: { base: ModuleDescriptor["slug"]; title: string; fallback: ModuleDescriptor[]; sheetParam: string | null; onSheet: (id: string) => void }): ReactNode {
  const { data } = useRemote<{ sheets: SheetInfo[] }>(`/api/sheets/${base}`);
  const tabs = data
    ? data.sheets.map((s) => ({ id: `${base}~${s.gid}`, label: s.name }))
    : fallback.map((m) => ({ id: m.slug, label: m.tabLabel ?? m.title }));
  const active = tabs.find((t) => t.id === sheetParam) ?? tabs[0];
  if (!active) return null;
  const heading = tabs.length > 1 ? `${title} · ${active.label}` : title;
  return (
    <>
      <TabBar label={title} tabs={tabs} active={active.id} onSelect={onSheet} size="sm" />
      <ModuleView key={active.id} module={{ slug: active.id, title: heading, group: "monitoring", description: `Sheet ${active.label} pada ${title}.` }} />
    </>
  );
}

/** Renders a module page; pages with several data sheets get tab bars (state kept in `?tab=` / `?sheet=`). */
export function ModulePageView({ page }: { page: ModulePage }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (key: "tab" | "sheet", value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    if (key === "tab") next.delete("sheet");
    next.delete("q");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  if (page.kind === "single") return <ModuleView key={page.tabs[0].slug} module={page.tabs[0]} />;

  if (page.kind === "workbook") {
    return <WorkbookView base={page.slug} title={page.title} fallback={page.tabs} sheetParam={params.get("sheet")} onSheet={(id) => set("sheet", id)} />;
  }

  const active = page.tabs.find((t) => t.slug === params.get("tab")) ?? page.tabs[0];
  const outer = <TabBar label={page.title} tabs={page.tabs.map((t) => ({ id: t.slug, label: t.tabLabel ?? t.title }))} active={active.slug} onSelect={(id) => set("tab", id)} />;

  if (page.kind === "years") {
    return (
      <>
        {outer}
        <WorkbookView key={active.slug} base={active.slug} title={active.title} fallback={[active]} sheetParam={params.get("sheet")} onSheet={(id) => set("sheet", id)} />
      </>
    );
  }

  return (
    <>
      {outer}
      <ModuleView key={active.slug} module={{ ...active, title: `${page.title} · ${active.tabLabel ?? active.title}` }} />
    </>
  );
}
