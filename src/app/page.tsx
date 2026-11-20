import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/layout/HeroSection";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { Logo } from "@/components/ui/Logo";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <AmbientBackground />
      <header className="sticky top-0 z-20 border-b border-line bg-abyss/70 backdrop-blur-xl">
        <div className="hairline-tricolor" />
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="focus-ring flex items-center gap-3 rounded-lg">
            <Logo size={34} priority />
            <span className="font-display text-sm font-semibold tracking-[0.12em] text-ink">SMART PUSBEKMATAU</span>
          </Link>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="focus-ring rounded-lg border border-line-strong px-4 py-2 text-xs text-ink transition hover:border-gold/50"
          >
            {user ? "Buka Command Center" : "Masuk"}
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <HeroSection authenticated={Boolean(user)} />
      </main>
      <Footer />
    </div>
  );
}
