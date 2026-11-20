"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  detail?: string;
}

const ToastContext = createContext<(tone: Tone, title: string, detail?: string) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info } as const;
const ACCENT: Record<Tone, string> = {
  success: "text-gold-soft",
  error: "text-crimson-soft",
  info: "text-ice",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((tone: Tone, title: string, detail?: string) => {
    const id = ++counter.current;
    setToasts((list) => [...list.slice(-3), { id, tone, title, detail }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 6500 : 3800);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                className="glass pointer-events-auto flex gap-3 rounded-xl px-4 py-3 shadow-2xl shadow-black/40"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", ACCENT[t.tone])} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  {t.detail && <p className="mt-0.5 text-xs leading-relaxed text-mist">{t.detail}</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
