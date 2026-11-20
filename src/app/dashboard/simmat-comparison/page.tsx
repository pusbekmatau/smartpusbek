import type { Metadata } from "next";
import { SimmatComparisonView } from "@/components/dashboard/SimmatComparisonView";

export const metadata: Metadata = { title: "Komparasi Tren SIMMAT" };

export default function SimmatComparisonPage() {
  return <SimmatComparisonView />;
}
