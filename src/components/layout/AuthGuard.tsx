import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { AppShell } from "./AppShell";

/**
 * Server-side gate for every Command Center page. The middleware already blocks
 * anonymous traffic; this re-validates against the user store (deactivated users,
 * role changes) and enforces role-restricted sections.
 */
export async function AuthGuard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return <AppShell user={user}>{children}</AppShell>;
}
