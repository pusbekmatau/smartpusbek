"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export const PILLARS = ["Cepat", "Tepat", "Teliti", "Aman"] as const;

/** The four core values, separated by alternating gold / crimson markers. */
export function PillarBar({ className, size = "md", delay = 0 }: { className?: string; size?: "sm" | "md"; delay?: number }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)} aria-label="Cepat, Tepat, Teliti, dan Aman">
      {PILLARS.map((pillar, i) => (
        <motion.li
          key={pillar}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3"
        >
          {i > 0 && <span aria-hidden className={cn("size-1 rotate-45", i % 2 ? "bg-gold" : "bg-crimson-soft")} />}
          <span className={cn("eyebrow text-mist", size === "md" ? "text-[0.72rem]" : "text-[0.62rem]")}>{pillar}</span>
        </motion.li>
      ))}
    </ul>
  );
}
