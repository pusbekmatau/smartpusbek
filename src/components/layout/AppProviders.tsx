"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { can, type Permission } from "@/lib/rbac";
import type { SessionUser, SystemStatus } from "@/lib/types";

interface SessionContextValue {
  user: SessionUser;
  can: (permission: Permission) => boolean;
}

interface SyncContextValue {
  /** Incremented on every user-triggered sync; data hooks refetch when it changes. */
  version: number;
  /** True when the current sync should bypass the server cache (Administrator only). */
  force: boolean;
  syncing: boolean;
  setSyncing: (v: boolean) => void;
  requestSync: () => void;
  status: SystemStatus | null;
  online: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const SyncContext = createContext<SyncContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside AppProviders");
  return ctx;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside AppProviders");
  return ctx;
}

export function AppProviders({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [online, setOnline] = useState(true);

  const forceAllowed = can(user.role, "data:force-sync");

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await apiFetch<SystemStatus>("/api/system/status"));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const id = setInterval(refreshStatus, 120_000);
    return () => clearInterval(id);
  }, [refreshStatus]);

  const requestSync = useCallback(() => {
    setVersion((v) => v + 1);
    void refreshStatus();
  }, [refreshStatus]);

  const session = useMemo<SessionContextValue>(() => ({ user, can: (p) => can(user.role, p) }), [user]);
  const sync = useMemo<SyncContextValue>(
    () => ({ version, force: forceAllowed && version > 0, syncing, setSyncing, requestSync, status, online }),
    [version, forceAllowed, syncing, requestSync, status, online],
  );

  return (
    <SessionContext.Provider value={session}>
      <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
    </SessionContext.Provider>
  );
}
