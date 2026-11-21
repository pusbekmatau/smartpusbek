import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/dashboard/GridSkeleton";
import { ModulePageView } from "@/components/dashboard/ModulePageView";
import { getPage, PAGES } from "@/lib/modules";

type Props = { params: Promise<{ slug: string }> };

// Static export: one prerendered page per data module.
export const dynamicParams = false;

export function generateStaticParams() {
  return PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mod = getPage((await params).slug);
  return { title: mod?.title ?? "Modul Data" };
}

export default async function ModulePage({ params }: Props) {
  const mod = getPage((await params).slug);
  if (!mod) notFound();
  return (
    <Suspense fallback={<GridSkeleton />}>
      <ModulePageView key={mod.slug} page={mod} />
    </Suspense>
  );
}
