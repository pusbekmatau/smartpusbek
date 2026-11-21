import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "./globals.css";
import { MotionProvider } from "@/components/ui/MotionProvider";

export const metadata: Metadata = {
  title: {
    default: "SMART PUSBEKMATAU — Central Monitoring & Integration System",
    template: "%s · SMART PUSBEKMATAU",
  },
  description:
    "Sistem Informasi Cerdas terintegrasi untuk Monitoring, FMS, SIMMAT, dan Logistik Pusbekmatau. Centre of Excellence — Cepat, Tepat, Teliti, dan Aman.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#050914",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-dvh bg-abyss text-ink antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
