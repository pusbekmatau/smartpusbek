import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Masuk" };

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/** Development-only helper; never rendered in production builds. */
function DevAccounts() {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <details className="mt-6 rounded-lg border border-dashed border-line px-4 py-3 text-xs text-mist">
      <summary className="cursor-pointer text-haze">Panel uji lokal (development)</summary>
      <ul className="tabular mt-2 space-y-1">
        <li>admin / Admin@Pusbek2026</li>
        <li>operator / Operator@Pusbek2026</li>
        <li>viewer / Viewer@Pusbek2026</li>
      </ul>
    </details>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <AmbientBackground />
      <LoginForm next={next} devPanel={<DevAccounts />} />
    </main>
  );
}
