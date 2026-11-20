import Link from "next/link";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <AmbientBackground intensity="calm" />
      <Logo size={64} />
      <p className="eyebrow text-gold-soft">Kode 404</p>
      <h1 className="font-display text-3xl text-ink">Koordinat tidak ditemukan</h1>
      <p className="max-w-md text-sm text-mist">Halaman atau modul data yang Anda tuju tidak tersedia pada Command Center.</p>
      <Link href="/dashboard" className="focus-ring mt-2 rounded-lg border border-line-strong px-4 py-2 text-sm text-ink hover:border-gold/50">
        Kembali ke Ringkasan Eksekutif
      </Link>
    </main>
  );
}
