"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg";
}

export function Modal({ open, onClose, title, eyebrow, children, footer, width = "md" }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Tutup" className="absolute inset-0 bg-abyss/75 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className={cn(
              "glass relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl shadow-2xl shadow-black/60 sm:rounded-2xl",
              width === "md" ? "sm:max-w-lg" : "sm:max-w-3xl",
            )}
          >
            <div className="hairline-tricolor" />
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
              <div>
                {eyebrow && <p className="eyebrow text-gold-soft">{eyebrow}</p>}
                <h2 id={titleId} className="mt-1 font-display text-xl text-ink">
                  {title}
                </h2>
              </div>
              <button onClick={onClose} className="focus-ring rounded-lg p-1.5 text-mist transition hover:bg-white/5 hover:text-ink" aria-label="Tutup">
                <X className="size-4" />
              </button>
            </header>
            <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
