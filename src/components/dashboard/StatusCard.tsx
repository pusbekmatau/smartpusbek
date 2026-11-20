"use client";

import { ServerCrash, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DEFAULT_MESSAGE =
  "Koneksi ke modul basis data ini sedang dibatasi oleh server. Silakan lakukan sinkronisasi ulang atau hubungi Administrator.";

export function StatusCard({ message = DEFAULT_MESSAGE, onRetry, retrying }: { message?: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl px-6 py-10 text-center sm:px-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-crimson/60 to-transparent" />
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-crimson/30 bg-crimson/10">
        <ServerCrash className="size-5 text-crimson-soft" aria-hidden />
      </div>
      <h3 className="mt-5 font-display text-xl text-ink">Modul Data Belum Dapat Dijangkau</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-mist">{message}</p>
      <Button className="mt-6" onClick={onRetry} loading={retrying} icon={<RefreshCw className="size-4" aria-hidden />}>
        Sinkronisasi Ulang
      </Button>
    </div>
  );
}
