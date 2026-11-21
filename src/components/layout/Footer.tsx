import { Logo } from "@/components/ui/Logo";

export const SYSTEM_VERSION = "v1.0.0";

export function Footer() {
  return (
    <footer className="relative mt-16">
      <div className="hairline-tricolor opacity-70" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Logo size={44} />
          <div>
            <p className="font-display text-base text-ink">
              SMART PUSBEKMATAU <span className="text-haze">—</span> <span className="text-gold-soft">Centre of Excellence</span>
            </p>
            <p className="mt-1 text-xs text-mist italic">&ldquo;Cepat, Tepat, Teliti, dan Aman&rdquo;</p>
          </div>
        </div>
        <div className="text-xs text-haze md:text-right">
          <p>© {new Date().getFullYear()} Pusat Pembekalan Materiel TNI Angkatan Udara. Hak cipta dilindungi.</p>
          <p className="tabular mt-1">Central Monitoring & Integration System · {SYSTEM_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}
