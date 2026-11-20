"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { readSession, saveSession } from "@/lib/session-client";
import type { Role, SessionUser } from "@/lib/types";
import { AppShell } from "./AppShell";
import { LoadingScreen } from "./LoadingScreen";

/**
 * Client-side gate for every Command Center page. The site is static, so the real
 * enforcement happens in the Apps Script backend (every request carries a signed token
 * and is re-checked against the user list); this guard keeps the UI in step with it:
 * anonymous visitors go to the login page, and the session is re-validated on entry so a
 * deactivated account or a role change takes effect immediately.
 */
export function AuthGuard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const stored = readSession();
    if (!stored) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (roles && !roles.includes(stored.user.role)) {
      router.replace("/dashboard");
      return;
    }
    setUser(stored.user);

    let cancelled = false;
    apiFetch<{ user: SessionUser }>("/api/auth/me")
      .then(({ user: fresh }) => {
        if (cancelled) return;
        saveSession({ ...stored, user: fresh });
        if (roles && !roles.includes(fresh.role)) {
          router.replace("/dashboard");
          return;
        }
        setUser((prev) => (prev && prev.id === fresh.id && prev.role === fresh.role && prev.name === fresh.name ? prev : fresh));
      })
      .catch(() => undefined); // 401 is handled (redirect to login) inside apiFetch
    return () => {
      cancelled = true;
    };
    // roles is a stable literal per layout; re-check only when the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!user) return <LoadingScreen />;
  return <AppShell user={user}>{children}</AppShell>;
}
