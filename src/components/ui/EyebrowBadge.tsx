import { cn } from "@/lib/cn";

export function EyebrowBadge({ children = "Centre of Excellence", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "eyebrow inline-flex items-center gap-2 rounded-full border border-gold/45 bg-gold/[0.06] px-3.5 py-1.5 text-gold-soft",
        className,
      )}
    >
      <span aria-hidden className="size-1 rounded-full bg-gold" />
      {children}
    </span>
  );
}
