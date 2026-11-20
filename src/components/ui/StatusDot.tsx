import { cn } from "@/lib/cn";

export function StatusDot({ tone = "live", className }: { tone?: "live" | "ok" | "warn"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 rounded-full",
        tone === "live" && "animate-pulse-live bg-crimson-soft",
        tone === "ok" && "bg-steel shadow-[0_0_10px_rgba(59,130,246,0.7)]",
        tone === "warn" && "bg-gold",
        className,
      )}
    />
  );
}
