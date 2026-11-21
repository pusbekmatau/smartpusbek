"use client";

import { useEffect, useState } from "react";
import { isRole } from "./rbac";
import type { SessionUser } from "./types";

/**
 * Browser-side session. The signed token is issued by the Apps Script backend and
 * verified there on every request; the copy of `user` kept here only drives the UI.
 */
const KEY = "pbk_session_v1";

export interface StoredSession {
  token: string;
  user: SessionUser;
  /** Unix seconds. */
  exp: number;
}

export function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof parsed.token !== "string" ||
      typeof parsed.exp !== "number" ||
      !parsed.user ||
      typeof parsed.user.id !== "string" ||
      typeof parsed.user.username !== "string" ||
      typeof parsed.user.name !== "string" ||
      !isRole(parsed.user.role)
    ) {
      return null;
    }
    if (parsed.exp * 1000 <= Date.now()) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable (private mode): the session lasts until reload */
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** `undefined` until the browser has been checked, then the signed-in user or `null`. */
export function useStoredUser(): SessionUser | null | undefined {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  useEffect(() => setUser(readSession()?.user ?? null), []);
  return user;
}
