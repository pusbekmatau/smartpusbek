"use client";

import { useState } from "react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import type { SessionUser } from "@/lib/types";
import { AppProviders } from "./AppProviders";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <AppProviders user={user}>
      <AmbientBackground intensity="calm" />
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-h-dvh flex-col lg:pl-72">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <Footer />
      </div>
    </AppProviders>
  );
}
