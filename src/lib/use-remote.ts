"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSync } from "@/components/layout/AppProviders";
import { ApiError, apiFetch } from "./api-client";

interface RemoteState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: (force?: boolean) => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Fetches a JSON resource and re-fetches whenever the global sync version changes.
 * When an Administrator triggers sync, `?refresh=1` asks the server to bypass its cache.
 */
export function useRemote<T>(url: string | null): RemoteState<T> {
  const { version, force, setSyncing } = useSync();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState<{ n: number; force: boolean }>({ n: 0, force: false });
  const lastVersion = useRef(version);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const syncTriggered = lastVersion.current !== version;
    lastVersion.current = version;
    const bypass = (syncTriggered && force) || nonce.force;
    const target = bypass ? `${url}${url.includes("?") ? "&" : "?"}refresh=1` : url;

    setLoading(true);
    if (syncTriggered) setSyncing(true);
    apiFetch<T>(target, { signal: controller.signal })
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err : new ApiError(0, "UNKNOWN", "Permintaan tidak dapat diproses."));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (syncTriggered) setSyncing(false);
      });
    return () => controller.abort();
  }, [url, version, force, nonce, setSyncing]);

  const reload = useCallback((forceReload = false) => setNonce((s) => ({ n: s.n + 1, force: forceReload })), []);

  return { data, error, loading, reload, setData };
}
