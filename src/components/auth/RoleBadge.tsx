import { ROLE_LABEL } from "@/lib/rbac";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/types";

const STYLE: Record<Role, string> = {
  ADMIN: "border-gold/50 bg-gold/[0.08] text-gold-soft",
  OPERATOR: "border-steel/45 bg-steel/[0.08] text-ice",
  VIEWER: "border-mist/30 bg-mist/[0.06] text-mist",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span className={cn("eyebrow inline-flex items-center rounded-md border px-2 py-0.5 !text-[0.58rem] !tracking-[0.22em]", STYLE[role], className)}>
      {ROLE_LABEL[role]}
    </span>
  );
}
