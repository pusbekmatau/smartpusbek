import { Logo } from "@/components/ui/Logo";
import { PillarBar } from "@/components/ui/PillarBar";

/** Branded loading state shown while server components resolve. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6" role="status" aria-label="Memuat Monitoring Center">
      <div className="relative">
        <div aria-hidden className="radar-sweep absolute -inset-10 rounded-full" />
        <Logo size={88} />
      </div>
      <div className="text-center">
        <p className="eyebrow text-gold-soft">Centre of Excellence</p>
        <p className="mt-2 text-sm text-mist">Menghubungkan ke Basis Data Server…</p>
      </div>
      <div className="skeleton h-0.5 w-48" />
      <PillarBar size="sm" className="justify-center" />
    </div>
  );
}
