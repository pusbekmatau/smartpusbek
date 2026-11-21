import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/dashboard/GridSkeleton";
import { ModuleView } from "@/components/dashboard/ModuleView";
import { getModule, MODULES } from "@/lib/modules";

type Props = { params: Promise<{ slug: string }> };

// Static export: one prerendered page per data module.
export const dynamicParams = false;

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mod = getModule((await params).slug);
  return { title: mod?.title ?? "Modul Data" };
}

export default async function ModulePage({ params }: Props) {
  const mod = getModule((await params).slug);
  if (!mod) notFound();
  return (
    <Suspense fallback={<GridSkeleton />}>
      <ModuleView key={mod.slug} module={mod} />
    </Suspense>
  );
}
