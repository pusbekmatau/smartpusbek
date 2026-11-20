"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-gold-soft to-gold text-abyss font-semibold shadow-[0_8px_30px_-10px_rgba(212,175,55,0.55)] hover:shadow-[0_10px_36px_-8px_rgba(212,175,55,0.7)] hover:brightness-105",
  secondary: "border border-line-strong bg-cobalt/10 text-ink hover:border-steel/50 hover:bg-cobalt/20",
  ghost: "text-mist hover:bg-white/[0.04] hover:text-ink",
  danger: "border border-crimson/50 bg-crimson/10 text-[#fca5a5] hover:border-crimson-soft hover:bg-crimson/20",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-lg whitespace-nowrap transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
