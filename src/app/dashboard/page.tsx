import type { Metadata } from "next";
import { OverviewView } from "@/components/dashboard/OverviewView";

export const metadata: Metadata = { title: "Ringkasan Eksekutif" };

export default function DashboardPage() {
  return <OverviewView />;
}
